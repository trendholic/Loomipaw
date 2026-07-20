'use strict';
const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const db = require('../db');
const { asyncHandler, HttpError, slugify } = require('../lib/util');
const { validate } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const catalog = require('../services/catalog');
const orders = require('../services/orders');
const settings = require('../services/settings');
const media = require('../lib/media');
const mailer = require('../lib/mailer');
const audit = require('../services/audit');
const { toCsv } = require('../lib/csv');
const { refreshRating } = require('./reviews');
const logger = require('../lib/logger');

const router = express.Router();
router.use(requireAdmin);
const money = (c) => (Number(c || 0) / 100).toFixed(2);
const sendCsv = (res, name, csv) => res.type('text/csv').set('Content-Disposition', `attachment; filename="${name}"`).send(csv);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(file.mimetype.startsWith('image/') ? null : new HttpError(400, 'Only image files are allowed'), file.mimetype.startsWith('image/')),
});

/* ============================== DASHBOARD =========================== */
router.get('/stats', asyncHandler(async (req, res) => {
  const paid = "status NOT IN ('pending','cancelled')";
  const revenue = db.prepare(`SELECT COALESCE(SUM(total_cents),0) c FROM orders WHERE ${paid}`).get().c;
  const orderCount = db.prepare(`SELECT COUNT(*) c FROM orders WHERE ${paid}`).get().c;
  const pending = db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('paid','processing')").get().c;
  const customers = db.prepare("SELECT COUNT(*) c FROM users WHERE role='customer'").get().c;
  const lowStock = db.prepare('SELECT COUNT(*) c FROM variants WHERE stock <= low_stock_at').get().c;
  const pendingReviews = db.prepare("SELECT COUNT(*) c FROM reviews WHERE status='pending'").get().c;
  const newMessages = db.prepare("SELECT COUNT(*) c FROM contact_messages WHERE status='new'").get().c;
  const aov = orderCount ? Math.round(revenue / orderCount) : 0;

  // 14-day revenue series
  const series = db.prepare(`SELECT substr(created_at,1,10) d, SUM(total_cents) c, COUNT(*) n
                             FROM orders WHERE ${paid} AND created_at >= datetime('now','-14 day')
                             GROUP BY d ORDER BY d`).all();
  const topProducts = db.prepare(`SELECT oi.title, SUM(oi.qty) qty, SUM(oi.qty*oi.unit_price_cents) revenue
                                  FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.${paid}
                                  GROUP BY oi.title ORDER BY revenue DESC LIMIT 5`).all();
  const recentOrders = db.prepare('SELECT number, email, status, total_cents, currency, created_at FROM orders ORDER BY created_at DESC LIMIT 8').all();

  res.json({ stats: { revenueCents: revenue, orders: orderCount, pending, customers, lowStock, pendingReviews, newMessages, aovCents: aov }, series, topProducts, recentOrders });
}));

/* ============================== PRODUCTS ============================ */
router.get('/products', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json({ products: rows.map((p) => catalog.serialize(p, { full: true })) });
}));

router.get('/products/:id', asyncHandler(async (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found');
  res.json({ product: catalog.serialize(p, { full: true }) });
}));

const productSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  subtitle: z.string().max(200).optional().default(''),
  description: z.string().max(8000).optional().default(''),
  details: z.string().max(8000).optional().default(''),
  price: z.coerce.number().min(0),
  compareAt: z.coerce.number().min(0).nullable().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional().default('active'),
  featured: z.coerce.boolean().optional().default(false),
  bestSeller: z.coerce.boolean().optional().default(false),
  tag: z.string().max(40).optional().default(''),
  seoTitle: z.string().max(200).optional().default(''),
  seoDescription: z.string().max(400).optional().default(''),
  variants: z.array(z.object({
    id: z.coerce.number().int().optional(),
    sku: z.string().trim().max(80).optional(),
    color: z.string().max(60).optional().default(''),
    colorHex: z.string().max(20).optional().default(''),
    size: z.string().max(40).optional().default(''),
    priceCents: z.coerce.number().int().nullable().optional(),
    stock: z.coerce.number().int().min(0).optional().default(0),
    lowStockAt: z.coerce.number().int().min(0).optional().default(5),
  })).optional().default([]),
});

function uniqueSlug(base, ignoreId) {
  let slug = slugify(base) || 'product';
  let n = 1; let candidate = slug;
  while (true) {
    const row = db.prepare('SELECT id FROM products WHERE slug = ?').get(candidate);
    if (!row || row.id === ignoreId) return candidate;
    candidate = `${slug}-${++n}`;
  }
}

const insertProduct = db.transaction((data) => {
  const slug = uniqueSlug(data.slug || data.title);
  const info = db.prepare(`INSERT INTO products (slug,title,category_id,subtitle,description,details,price_cents,compare_at_cents,status,featured,best_seller,tag,seo_title,seo_description)
    VALUES (@slug,@title,@category_id,@subtitle,@description,@details,@price_cents,@compare_at_cents,@status,@featured,@best_seller,@tag,@seo_title,@seo_description)`).run({
    slug, title: data.title, category_id: data.categoryId || null, subtitle: data.subtitle, description: data.description,
    details: data.details, price_cents: Math.round(data.price * 100), compare_at_cents: data.compareAt ? Math.round(data.compareAt * 100) : null,
    status: data.status, featured: data.featured ? 1 : 0, best_seller: data.bestSeller ? 1 : 0, tag: data.tag,
    seo_title: data.seoTitle, seo_description: data.seoDescription,
  });
  const id = info.lastInsertRowid;
  saveVariants(id, data.variants, slug);
  return id;
});

function saveVariants(productId, variants, slug) {
  const existing = db.prepare('SELECT id FROM variants WHERE product_id = ?').all(productId).map((r) => r.id);
  const keep = new Set();
  variants.forEach((v, i) => {
    const sku = v.sku || `${(slug || 'sku').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${(v.color || 'X').slice(0, 3).toUpperCase()}-${(v.size || i).toString().toUpperCase()}`;
    if (v.id && existing.includes(v.id)) {
      db.prepare('UPDATE variants SET sku=?, color=?, color_hex=?, size=?, price_cents=?, stock=?, low_stock_at=?, position=? WHERE id=?')
        .run(sku, v.color, v.colorHex, v.size, v.priceCents ?? null, v.stock, v.lowStockAt, i, v.id);
      keep.add(v.id);
    } else {
      const info = db.prepare('INSERT INTO variants (product_id,sku,color,color_hex,size,price_cents,stock,low_stock_at,position) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(productId, uniqueSku(sku), v.color, v.colorHex, v.size, v.priceCents ?? null, v.stock, v.lowStockAt, i);
      keep.add(info.lastInsertRowid);
    }
  });
  for (const id of existing) if (!keep.has(id)) db.prepare('DELETE FROM variants WHERE id = ?').run(id);
}

function uniqueSku(base) {
  let candidate = base; let n = 1;
  while (db.prepare('SELECT id FROM variants WHERE sku = ?').get(candidate)) candidate = `${base}-${++n}`;
  return candidate;
}

router.post('/products', validate({ body: productSchema }), asyncHandler(async (req, res) => {
  const id = insertProduct(req.body);
  res.status(201).json({ product: catalog.serialize(db.prepare('SELECT * FROM products WHERE id = ?').get(id), { full: true }) });
}));

const updateProduct = db.transaction((id, data) => {
  const cur = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'Product not found');
  const slug = data.slug ? uniqueSlug(data.slug, id) : cur.slug;
  db.prepare(`UPDATE products SET slug=@slug,title=@title,category_id=@category_id,subtitle=@subtitle,description=@description,details=@details,
    price_cents=@price_cents,compare_at_cents=@compare_at_cents,status=@status,featured=@featured,best_seller=@best_seller,tag=@tag,
    seo_title=@seo_title,seo_description=@seo_description,updated_at=datetime('now') WHERE id=@id`).run({
    id, slug, title: data.title, category_id: data.categoryId || null, subtitle: data.subtitle, description: data.description,
    details: data.details, price_cents: Math.round(data.price * 100), compare_at_cents: data.compareAt ? Math.round(data.compareAt * 100) : null,
    status: data.status, featured: data.featured ? 1 : 0, best_seller: data.bestSeller ? 1 : 0, tag: data.tag,
    seo_title: data.seoTitle, seo_description: data.seoDescription,
  });
  saveVariants(id, data.variants, slug);
});

router.put('/products/:id', validate({ body: productSchema }), asyncHandler(async (req, res) => {
  updateProduct(Number(req.params.id), req.body);
  res.json({ product: catalog.serialize(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id), { full: true }) });
}));

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const imgs = db.prepare('SELECT srcset_json, url FROM product_images WHERE product_id = ?').all(req.params.id);
  for (const im of imgs) { media.remove(im.url); try { JSON.parse(im.srcset_json || '[]').forEach((s) => media.remove(s.url)); } catch {} }
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

/* --------------------------- Product images ------------------------ */
router.post('/products/:id/images', upload.single('image'), asyncHandler(async (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  if (!req.file) throw new HttpError(400, 'No image uploaded');
  const processed = await media.processImage(req.file.buffer);
  const pos = db.prepare('SELECT COALESCE(MAX(position),-1)+1 p FROM product_images WHERE product_id = ?').get(product.id).p;
  const info = db.prepare('INSERT INTO product_images (product_id, url, srcset_json, alt, position) VALUES (?, ?, ?, ?, ?)')
    .run(product.id, processed.url, JSON.stringify(processed.srcset), req.body.alt || '', pos);
  res.status(201).json({ image: { id: info.lastInsertRowid, url: processed.url, srcset: processed.srcset } });
}));

router.delete('/products/:id/images/:imageId', asyncHandler(async (req, res) => {
  const img = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(req.params.imageId, req.params.id);
  if (img) {
    media.remove(img.url);
    try { JSON.parse(img.srcset_json || '[]').forEach((s) => media.remove(s.url)); } catch {}
    db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id);
  }
  res.json({ ok: true });
}));

/* ============================ CATEGORIES =========================== */
router.get('/categories', asyncHandler(async (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM categories ORDER BY position, name').all() });
}));
router.post('/categories', validate({ body: z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(1000).optional().default(''), image: z.string().max(400).optional().default(''), position: z.coerce.number().int().optional().default(0) }) }),
  asyncHandler(async (req, res) => {
    const slug = uniqueCategorySlug(req.body.name);
    const info = db.prepare('INSERT INTO categories (slug,name,description,image,position) VALUES (?,?,?,?,?)')
      .run(slug, req.body.name, req.body.description, req.body.image, req.body.position);
    res.status(201).json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) });
  }));
router.put('/categories/:id', validate({ body: z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(1000).optional().default(''), image: z.string().max(400).optional().default(''), position: z.coerce.number().int().optional().default(0) }) }),
  asyncHandler(async (req, res) => {
    db.prepare('UPDATE categories SET name=?, description=?, image=?, position=? WHERE id=?')
      .run(req.body.name, req.body.description, req.body.image, req.body.position, req.params.id);
    res.json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) });
  }));
router.delete('/categories/:id', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));
function uniqueCategorySlug(name) {
  let s = slugify(name) || 'category'; let c = s; let n = 1;
  while (db.prepare('SELECT id FROM categories WHERE slug = ?').get(c)) c = `${s}-${++n}`;
  return c;
}

/* ============================= INVENTORY =========================== */
router.get('/inventory', asyncHandler(async (req, res) => {
  const rows = db.prepare(`SELECT v.id, v.sku, v.color, v.size, v.stock, v.low_stock_at, p.title, p.slug
                           FROM variants v JOIN products p ON p.id = v.product_id ORDER BY v.stock ASC, p.title`).all();
  res.json({ inventory: rows });
}));
router.patch('/inventory/:variantId', validate({ body: z.object({ stock: z.coerce.number().int().min(0), reason: z.string().max(120).optional() }) }),
  asyncHandler(async (req, res) => {
    const v = db.prepare('SELECT * FROM variants WHERE id = ?').get(req.params.variantId);
    if (!v) throw new HttpError(404, 'Variant not found');
    const delta = req.body.stock - v.stock;
    db.prepare('UPDATE variants SET stock = ? WHERE id = ?').run(req.body.stock, v.id);
    db.prepare('INSERT INTO inventory_log (variant_id, delta, reason, ref) VALUES (?, ?, ?, ?)').run(v.id, delta, req.body.reason || 'adjustment', 'admin');
    res.json({ ok: true, stock: req.body.stock });
  }));

/* ============================== ORDERS ============================= */
router.get('/orders', asyncHandler(async (req, res) => {
  const status = req.query.status;
  const rows = status && status !== 'all'
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json({ orders: rows.map((o) => orders.withItems(o)) });
}));
router.get('/orders/:number', asyncHandler(async (req, res) => {
  const o = orders.byNumber(req.params.number);
  if (!o) throw new HttpError(404, 'Order not found');
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at').all(o.id);
  res.json({ order: orders.withItems(o), payments });
}));
router.patch('/orders/:number', validate({ body: z.object({ status: z.enum(orders.STATUS_FLOW).optional(), tracking: z.string().max(120).optional(), notes: z.string().max(2000).optional() }) }),
  asyncHandler(async (req, res) => {
    const o = orders.byNumber(req.params.number);
    if (!o) throw new HttpError(404, 'Order not found');
    if (req.body.notes != null) db.prepare("UPDATE orders SET notes=?, updated_at=datetime('now') WHERE id=?").run(req.body.notes, o.id);
    let updated = o;
    if (req.body.status || req.body.tracking != null) {
      updated = orders.updateStatus(o, req.body.status || o.status, { tracking: req.body.tracking });
      const full = orders.withItems(updated);
      if (req.body.status && ['processing', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(req.body.status)) {
        mailer.sendOrderStatus(full).catch((e) => logger.warn('status email failed', { e: e.message }));
      }
    }
    res.json({ order: orders.withItems(orders.byId(o.id)) });
  }));

/* ============================== REFUNDS =========================== */
// Issue a refund through the active payment provider, then mark the order
// refunded (which also restocks). Safe for the dev provider (simulated).
router.post('/orders/:number/refund', asyncHandler(async (req, res) => {
  const order = orders.byNumber(req.params.number);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status === 'refunded') throw new HttpError(409, 'Order is already refunded');
  if (order.financial_status !== 'paid') throw new HttpError(409, 'Only paid orders can be refunded');

  const payments = require('../lib/payments');
  const last = orders.latestPayment(order.id);
  const provider = payments.byName(order.payment_provider) || payments.active();
  let result;
  try {
    result = await provider.refund({ ref: order.payment_ref || last?.provider_ref, amountCents: order.total_cents, currency: order.currency });
  } catch (e) {
    throw new HttpError(502, `Refund failed at gateway: ${e.message}`);
  }
  orders.recordPayment(order.id, { provider: provider.name, ref: result.ref, amountCents: -order.total_cents, currency: order.currency, status: 'refunded', raw: result.raw });
  const updated = orders.updateStatus(order, 'refunded');
  mailer.sendOrderStatus(orders.withItems(updated)).catch((e) => logger.warn('refund email failed', { e: e.message }));
  audit.log(req, 'order.refund', `order:${order.number}`, { amountCents: order.total_cents });
  res.json({ ok: true, order: orders.withItems(orders.byId(order.id)) });
}));

/* ============================= CUSTOMERS =========================== */
router.get('/customers', asyncHandler(async (req, res) => {
  const rows = db.prepare(`SELECT u.id, u.email, u.name, u.role, u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) orders,
      (SELECT COALESCE(SUM(total_cents),0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('pending','cancelled')) spent
    FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC`).all();
  res.json({ customers: rows });
}));
router.get('/customers/:id', asyncHandler(async (req, res) => {
  const u = db.prepare('SELECT id, email, name, phone, role, address_json, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!u) throw new HttpError(404, 'Customer not found');
  const orderRows = db.prepare('SELECT number, status, total_cents, currency, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(u.id);
  res.json({ customer: u, orders: orderRows });
}));

/* ============================== COUPONS ============================ */
router.get('/coupons', asyncHandler(async (req, res) => res.json({ coupons: db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all() })));
const couponSchema = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().min(0),
  minSubtotal: z.coerce.number().min(0).optional().default(0),
  freeShipping: z.coerce.boolean().optional().default(false),
  active: z.coerce.boolean().optional().default(true),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).optional().default(0),
});
router.post('/coupons', validate({ body: couponSchema }), asyncHandler(async (req, res) => {
  const b = req.body;
  const value = b.type === 'fixed' ? Math.round(b.value * 100) : Math.round(b.value);
  try {
    const info = db.prepare(`INSERT INTO coupons (code,type,value,min_subtotal_cents,free_shipping,active,starts_at,ends_at,usage_limit)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(b.code.toUpperCase(), b.type, value, Math.round(b.minSubtotal * 100), b.freeShipping ? 1 : 0, b.active ? 1 : 0, b.startsAt || null, b.endsAt || null, b.usageLimit);
    res.status(201).json({ coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'A coupon with this code already exists');
    throw e;
  }
}));
router.put('/coupons/:id', validate({ body: couponSchema }), asyncHandler(async (req, res) => {
  const b = req.body;
  const value = b.type === 'fixed' ? Math.round(b.value * 100) : Math.round(b.value);
  db.prepare(`UPDATE coupons SET code=?,type=?,value=?,min_subtotal_cents=?,free_shipping=?,active=?,starts_at=?,ends_at=?,usage_limit=? WHERE id=?`)
    .run(b.code.toUpperCase(), b.type, value, Math.round(b.minSubtotal * 100), b.freeShipping ? 1 : 0, b.active ? 1 : 0, b.startsAt || null, b.endsAt || null, b.usageLimit, req.params.id);
  res.json({ coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id) });
}));
router.delete('/coupons/:id', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

/* ============================== REVIEWS =========================== */
router.get('/reviews', asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  const rows = db.prepare(`SELECT r.*, p.title product_title, p.slug product_slug FROM reviews r JOIN products p ON p.id=r.product_id
    ${status === 'all' ? '' : 'WHERE r.status = @status'} ORDER BY r.created_at DESC`).all(status === 'all' ? {} : { status });
  res.json({ reviews: rows });
}));
router.patch('/reviews/:id', validate({ body: z.object({ status: z.enum(['pending', 'approved', 'rejected']) }) }),
  asyncHandler(async (req, res) => {
    const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!r) throw new HttpError(404, 'Review not found');
    db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(req.body.status, r.id);
    refreshRating(r.product_id);
    res.json({ ok: true });
  }));
router.delete('/reviews/:id', asyncHandler(async (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  if (r) refreshRating(r.product_id);
  res.json({ ok: true });
}));

/* ========================= MESSAGES / NEWSLETTER =================== */
router.get('/messages', asyncHandler(async (req, res) => res.json({ messages: db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() })));
router.patch('/messages/:id', validate({ body: z.object({ status: z.enum(['new', 'read', 'closed']) }) }), asyncHandler(async (req, res) => {
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ ok: true });
}));
router.get('/newsletter', asyncHandler(async (req, res) => res.json({ subscribers: db.prepare('SELECT * FROM newsletter ORDER BY created_at DESC').all() })));

/* =========================== ANALYTICS ============================ */
router.get('/analytics', asyncHandler(async (req, res) => {
  const paid = "status NOT IN ('pending','cancelled')";
  // 30-day revenue + order series
  const revenue = db.prepare(`SELECT substr(created_at,1,10) d, SUM(total_cents) c, COUNT(*) n
    FROM orders WHERE ${paid} AND created_at >= datetime('now','-30 day') GROUP BY d ORDER BY d`).all();
  // Customer growth (cumulative signups by day, 30d)
  const signups = db.prepare(`SELECT substr(created_at,1,10) d, COUNT(*) n FROM users WHERE role='customer'
    AND created_at >= datetime('now','-30 day') GROUP BY d ORDER BY d`).all();
  const totalCustomers = db.prepare("SELECT COUNT(*) n FROM users WHERE role='customer'").get().n;
  // Product performance
  const products = db.prepare(`SELECT oi.title, SUM(oi.qty) units, SUM(oi.qty*oi.unit_price_cents) revenue,
    COUNT(DISTINCT oi.order_id) orders FROM order_items oi JOIN orders o ON o.id=oi.order_id
    WHERE o.${paid} GROUP BY oi.title ORDER BY revenue DESC LIMIT 10`).all();
  // Conversion proxy: paid orders vs registered customers, repeat-rate
  const buyers = db.prepare(`SELECT COUNT(DISTINCT user_id) n FROM orders WHERE ${paid} AND user_id IS NOT NULL`).get().n;
  const repeat = db.prepare(`SELECT COUNT(*) n FROM (SELECT user_id FROM orders WHERE ${paid} AND user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1)`).get().n;
  // Status breakdown
  const byStatus = db.prepare('SELECT status, COUNT(*) n FROM orders GROUP BY status').all();
  res.json({
    revenue, signups, totalCustomers, products, byStatus,
    conversion: {
      buyers,
      repeatBuyers: repeat,
      repeatRate: buyers ? Math.round(repeat / buyers * 100) : 0,
      conversionRate: totalCustomers ? Math.round(buyers / totalCustomers * 100) : 0,
    },
  });
}));

/* ======================= LOW-STOCK ALERTS ========================= */
router.get('/alerts', asyncHandler(async (req, res) => {
  const lowStock = db.prepare(`SELECT v.id, v.sku, v.color, v.size, v.stock, v.low_stock_at, p.title, p.slug
    FROM variants v JOIN products p ON p.id = v.product_id WHERE v.stock <= v.low_stock_at ORDER BY v.stock ASC LIMIT 50`).all();
  res.json({ lowStock });
}));

/* ========================= ACTIVITY LOG =========================== */
router.get('/activity', validate({ query: z.object({ action: z.string().optional(), page: z.coerce.number().int().min(1).optional() }) }),
  asyncHandler(async (req, res) => {
    const page = req.validated.query.page || 1; const limit = 60;
    const rows = audit.list({ limit, offset: (page - 1) * limit, action: req.validated.query.action });
    const total = db.prepare('SELECT COUNT(*) n FROM audit_log').get().n;
    res.json({ activity: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));

/* ============================ EXPORTS ============================= */
router.get('/export/orders.csv', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const csv = toCsv(
    ['Order', 'Date', 'Email', 'Status', 'Payment', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Currency', 'Coupon', 'Tracking'],
    rows.map((o) => {
      const items = db.prepare('SELECT SUM(qty) n FROM order_items WHERE order_id = ?').get(o.id).n || 0;
      return [o.number, o.created_at, o.email, o.status, o.financial_status, items, money(o.subtotal_cents), money(o.discount_cents), money(o.shipping_cents), money(o.tax_cents), money(o.total_cents), o.currency, o.coupon_code, o.tracking_number];
    })
  );
  sendCsv(res, 'orders.csv', csv);
}));

router.get('/export/products.csv', asyncHandler(async (req, res) => {
  const rows = db.prepare(`SELECT p.*, c.name cat, (SELECT SUM(stock) FROM variants WHERE product_id=p.id) stock,
    (SELECT COUNT(*) FROM variants WHERE product_id=p.id) variants FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.title`).all();
  const csv = toCsv(
    ['Title', 'Slug', 'Category', 'Price', 'CompareAt', 'Status', 'Tag', 'Featured', 'BestSeller', 'Variants', 'TotalStock', 'Rating', 'Reviews'],
    rows.map((p) => [p.title, p.slug, p.cat || '', money(p.price_cents), p.compare_at_cents ? money(p.compare_at_cents) : '', p.status, p.tag, p.featured ? 'yes' : 'no', p.best_seller ? 'yes' : 'no', p.variants, p.stock || 0, p.rating_avg, p.rating_count])
  );
  sendCsv(res, 'products.csv', csv);
}));

router.get('/export/customers.csv', asyncHandler(async (req, res) => {
  const rows = db.prepare(`SELECT u.email, u.name, u.created_at, u.last_login_at,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) orders,
    (SELECT COALESCE(SUM(total_cents),0) FROM orders o WHERE o.user_id=u.id AND o.status NOT IN ('pending','cancelled')) spent
    FROM users u WHERE u.role='customer' ORDER BY u.created_at DESC`).all();
  const csv = toCsv(['Email', 'Name', 'Joined', 'LastLogin', 'Orders', 'TotalSpent'],
    rows.map((c) => [c.email, c.name, c.created_at, c.last_login_at || '', c.orders, money(c.spent)]));
  sendCsv(res, 'customers.csv', csv);
}));

router.get('/export/inventory.csv', asyncHandler(async (req, res) => {
  const rows = db.prepare(`SELECT p.title, v.sku, v.color, v.size, v.stock, v.low_stock_at
    FROM variants v JOIN products p ON p.id=v.product_id ORDER BY p.title, v.position`).all();
  const csv = toCsv(['Product', 'SKU', 'Color', 'Size', 'Stock', 'LowStockAt'],
    rows.map((v) => [v.title, v.sku, v.color, v.size, v.stock, v.low_stock_at]));
  sendCsv(res, 'inventory.csv', csv);
}));

/* ========================= BULK ACTIONS =========================== */
const bulkOrders = db.transaction((numbers, status) => {
  let n = 0;
  for (const number of numbers) {
    const o = orders.byNumber(number);
    if (o) { orders.updateStatus(o, status); n++; }
  }
  return n;
});
router.patch('/bulk/orders', validate({ body: z.object({ numbers: z.array(z.string()).min(1).max(500), status: z.enum(orders.STATUS_FLOW) }) }),
  asyncHandler(async (req, res) => {
    const n = bulkOrders(req.body.numbers, req.body.status);
    res.json({ ok: true, updated: n });
  }));

const bulkStock = db.transaction((items) => {
  let n = 0;
  for (const it of items) {
    const v = db.prepare('SELECT stock FROM variants WHERE id = ?').get(it.id);
    if (!v) continue;
    db.prepare('UPDATE variants SET stock = ? WHERE id = ?').run(it.stock, it.id);
    db.prepare('INSERT INTO inventory_log (variant_id, delta, reason, ref) VALUES (?, ?, ?, ?)').run(it.id, it.stock - v.stock, 'bulk adjustment', 'admin');
    n++;
  }
  return n;
});
router.patch('/bulk/inventory', validate({ body: z.object({ items: z.array(z.object({ id: z.coerce.number().int(), stock: z.coerce.number().int().min(0) })).min(1).max(1000) }) }),
  asyncHandler(async (req, res) => res.json({ ok: true, updated: bulkStock(req.body.items) })));

router.patch('/bulk/products', validate({ body: z.object({ ids: z.array(z.coerce.number().int()).min(1).max(500), status: z.enum(['active', 'draft', 'archived']) }) }),
  asyncHandler(async (req, res) => {
    const stmt = db.prepare("UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?");
    const tx = db.transaction((ids) => { let n = 0; for (const id of ids) { if (stmt.run(req.body.status, id).changes) n++; } return n; });
    res.json({ ok: true, updated: tx(req.body.ids) });
  }));

/* ============================== SETTINGS =========================== */
router.get('/settings', asyncHandler(async (req, res) => res.json({ settings: settings.all() })));
router.put('/settings', validate({ body: z.object({
  store: z.object({}).passthrough().optional(),
  shipping: z.object({}).passthrough().optional(),
  tax: z.object({}).passthrough().optional(),
  payments: z.object({}).passthrough().optional(),
}) }), asyncHandler(async (req, res) => {
  for (const key of ['store', 'shipping', 'tax', 'payments']) {
    if (req.body[key]) settings.set(key, { ...settings.get(key), ...req.body[key] });
  }
  res.json({ settings: settings.all() });
}));

module.exports = router;
