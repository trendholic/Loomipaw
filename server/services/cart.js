'use strict';
/** Server-side cart: persisted in DB, keyed by cookie token and/or user. */
const db = require('../db');
const { randomToken, HttpError } = require('../lib/util');
const settings = require('./settings');
const coupons = require('./coupons');

const q = {
  cartByToken: db.prepare('SELECT * FROM carts WHERE token = ?'),
  cartByUser: db.prepare('SELECT * FROM carts WHERE user_id = ? ORDER BY id DESC LIMIT 1'),
  insertCart: db.prepare('INSERT INTO carts (token, user_id) VALUES (?, ?)'),
  attachUser: db.prepare("UPDATE carts SET user_id = ?, updated_at = datetime('now') WHERE id = ?"),
  touch: db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?"),
  items: db.prepare('SELECT * FROM cart_items WHERE cart_id = ?'),
  itemByVariant: db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?'),
  insertItem: db.prepare('INSERT INTO cart_items (cart_id, variant_id, qty) VALUES (?, ?, ?)'),
  updateItem: db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?'),
  deleteItem: db.prepare('DELETE FROM cart_items WHERE id = ?'),
  clearItems: db.prepare('DELETE FROM cart_items WHERE cart_id = ?'),
  variant: db.prepare(`SELECT v.*, p.title AS product_title, p.slug AS product_slug, p.price_cents AS product_price,
                              p.status AS product_status,
                              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image
                       FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`),
};

// Resolve (or create) the caller's cart. Returns the cart row.
function resolve(req, res) {
  let cart = null;
  if (req.user) cart = q.cartByUser.get(req.user.id);
  const token = req.cookies?.lp_cart;
  if (!cart && token) cart = q.cartByToken.get(token);

  if (!cart) {
    const newToken = token || randomToken(20);
    const info = q.insertCart.run(newToken, req.user ? req.user.id : null);
    cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(info.lastInsertRowid);
    if (res) setCartCookie(res, newToken);
  } else if (req.user && !cart.user_id) {
    q.attachUser.run(req.user.id, cart.id);
    cart.user_id = req.user.id;
  }
  if (res && cart.token) setCartCookie(res, cart.token);
  return cart;
}

function setCartCookie(res, token) {
  res.cookie('lp_cart', token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, path: '/',
  });
}

function addItem(cart, variantId, qty) {
  const variant = q.variant.get(variantId);
  if (!variant || variant.product_status !== 'active') throw new HttpError(404, 'Product variant not available');
  const existing = q.itemByVariant.get(cart.id, variantId);
  const desired = (existing ? existing.qty : 0) + qty;
  if (desired > variant.stock) throw new HttpError(409, `Only ${variant.stock} in stock`, { stock: variant.stock });
  if (existing) q.updateItem.run(desired, existing.id);
  else q.insertItem.run(cart.id, variantId, qty);
  q.touch.run(cart.id);
}

function setItem(cart, variantId, qty) {
  const variant = q.variant.get(variantId);
  if (!variant) throw new HttpError(404, 'Variant not found');
  const existing = q.itemByVariant.get(cart.id, variantId);
  if (qty <= 0) { if (existing) q.deleteItem.run(existing.id); q.touch.run(cart.id); return; }
  if (qty > variant.stock) throw new HttpError(409, `Only ${variant.stock} in stock`, { stock: variant.stock });
  if (existing) q.updateItem.run(qty, existing.id);
  else q.insertItem.run(cart.id, variantId, qty);
  q.touch.run(cart.id);
}

function removeItem(cart, variantId) {
  const existing = q.itemByVariant.get(cart.id, variantId);
  if (existing) q.deleteItem.run(existing.id);
  q.touch.run(cart.id);
}

function clear(cart) { q.clearItems.run(cart.id); }

// Build a fully-priced view of the cart.
function detail(cart, { couponCode = null, shippingMethodId = null } = {}) {
  const rows = q.items.all(cart.id);
  const items = [];
  let subtotal = 0;
  for (const it of rows) {
    const v = q.variant.get(it.variant_id);
    if (!v) { q.deleteItem.run(it.id); continue; }
    const unit = v.price_cents != null ? v.price_cents : v.product_price;
    const line = unit * it.qty;
    subtotal += line;
    items.push({
      variantId: v.id,
      productSlug: v.product_slug,
      title: v.product_title,
      variantLabel: [v.color, v.size].filter(Boolean).join(' · '),
      sku: v.sku,
      image: v.image,
      unitPriceCents: unit,
      qty: it.qty,
      lineCents: line,
      stock: v.stock,
      maxQty: v.stock,
    });
  }

  const shipCfg = settings.get('shipping');
  const taxCfg = settings.get('tax');
  const store = settings.get('store');

  // Coupon
  let discount = 0, couponInfo = null, freeShipFromCoupon = false;
  if (couponCode) {
    const check = coupons.validate(couponCode, subtotal);
    if (check.ok) {
      discount = coupons.discountFor(check.coupon, subtotal);
      freeShipFromCoupon = !!check.coupon.free_shipping;
      couponInfo = { code: check.coupon.code, type: check.coupon.type, value: check.coupon.value, discountCents: discount, freeShipping: freeShipFromCoupon };
    } else {
      couponInfo = { code: couponCode, invalid: true, reason: check.reason };
    }
  }

  const taxable = Math.max(0, subtotal - discount);

  // Shipping
  const methods = shipCfg.methods || [];
  const method = methods.find((m) => m.id === shippingMethodId) || methods[0] || { id: 'standard', label: 'Standard', priceCents: 0 };
  let shipping = method.priceCents;
  const freeThreshold = shipCfg.freeThresholdCents || 0;
  const qualifiesFree = freeShipFromCoupon || (freeThreshold > 0 && subtotal >= freeThreshold);
  if (qualifiesFree) shipping = 0;

  // Tax (on discounted subtotal + shipping unless included)
  const rate = (taxCfg.ratePercent || 0) / 100;
  const tax = taxCfg.includedInPrice ? 0 : Math.round((taxable + shipping) * rate);

  const total = taxable + shipping + tax;

  return {
    token: cart.token,
    currency: store.currency || 'USD',
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: total,
    coupon: couponInfo,
    shipping: {
      methodId: method.id,
      methods,
      freeThresholdCents: freeThreshold,
      qualifiesFree,
      remainingForFreeCents: qualifiesFree ? 0 : Math.max(0, freeThreshold - subtotal),
    },
    tax: { ratePercent: taxCfg.ratePercent || 0, includedInPrice: !!taxCfg.includedInPrice },
  };
}

// Merge a guest cart (token) into the user's cart on login.
function mergeGuestIntoUser(token, userId) {
  if (!token) return;
  const guest = q.cartByToken.get(token);
  if (!guest) return;
  let userCart = q.cartByUser.get(userId);
  if (!userCart) {
    q.attachUser.run(userId, guest.id);
    return;
  }
  if (userCart.id === guest.id) return;
  for (const it of q.items.all(guest.id)) {
    const existing = q.itemByVariant.get(userCart.id, it.variant_id);
    const v = q.variant.get(it.variant_id);
    if (!v) continue;
    const merged = Math.min((existing ? existing.qty : 0) + it.qty, v.stock);
    if (existing) q.updateItem.run(merged, existing.id);
    else q.insertItem.run(userCart.id, it.variant_id, merged);
  }
  q.clearItems.run(guest.id);
}

module.exports = { resolve, addItem, setItem, removeItem, clear, detail, mergeGuestIntoUser, setCartCookie, _q: q };
