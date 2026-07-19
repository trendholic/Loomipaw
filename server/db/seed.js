'use strict';
/**
 * Seeds the store with production-shaped data: admin account, categories,
 * a full catalogue with variants + stock + imagery, coupons, and reviews.
 * Idempotent-ish: clears catalogue tables and reseeds; preserves orders.
 */
const bcrypt = require('bcryptjs');
const db = require('./index');
const config = require('../config');
const { slugify } = require('../lib/util');
const settings = require('../services/settings');

const IMG = (name) => `/assets/img/${name}.webp`;
const img = (name, alt) => ({ url: IMG(name), srcset: [{ w: 800, url: IMG(name) }], alt: alt || '' });

const CATEGORIES = [
  { slug: 'apparel', name: 'Dog Apparel', description: 'Tailored knits, coats and everyday layers.', image: IMG('knit') },
  { slug: 'walking', name: 'Walking Essentials', description: 'Harnesses, leads and adventure-ready gear.', image: IMG('harness') },
  { slug: 'accessories', name: 'Luxury Accessories', description: 'Collars, tags, bandanas and finishing touches.', image: IMG('accessories') },
  { slug: 'beds', name: 'Beds & Comfort', description: 'Orthopedic beds, loungers and throws.', image: IMG('bed') },
  { slug: 'matching', name: 'Matching Human + Pet', description: 'Coordinated sets for you and your best friend.', image: IMG('matching') },
];

const PRODUCTS = [
  { slug: 'aspen-merino-knit', title: 'Aspen Merino Knit', category: 'apparel', subtitle: 'Fine-gauge merino sweater', price: 78, compareAt: 96, tag: 'Best Seller', featured: 1, bestSeller: 1, img: 'knit', alt: 'ugc3',
    colors: [['Oat', '#DED0BB'], ['Clay', '#A9764F'], ['Ink', '#1B1915']], sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 18 },
  { slug: 'trailhead-adventure-harness', title: 'Trailhead Adventure Harness', category: 'walking', subtitle: 'No-pull padded harness', price: 64, compareAt: null, tag: 'New', featured: 1, bestSeller: 1, img: 'harness', alt: 'ugc1',
    colors: [['Sage', '#8B9A7B'], ['Sand', '#DED0BB'], ['Charcoal', '#34302A']], sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 26 },
  { slug: 'cloud-orthopedic-lounger', title: 'Cloud Orthopedic Lounger', category: 'beds', subtitle: 'Memory-foam bolster bed', price: 189, compareAt: 220, tag: 'Best Seller', featured: 1, bestSeller: 1, img: 'bed', alt: 'ugc2',
    colors: [['Cream', '#F4EDE1'], ['Taupe', '#BCAB90'], ['Espresso', '#4B3B2C']], sizes: ['S', 'M', 'L'], stock: 12 },
  { slug: 'heritage-leather-collar', title: 'Heritage Leather Collar', category: 'accessories', subtitle: 'Full-grain leather, brass hardware', price: 52, compareAt: null, tag: '', featured: 0, bestSeller: 1, img: 'accessories', alt: 'lead',
    colors: [['Tan', '#A9764F'], ['Cognac', '#8A5E3C'], ['Black', '#1B1915']], sizes: ['XS', 'S', 'M', 'L'], stock: 30 },
  { slug: 'storm-weatherproof-coat', title: 'Storm Weatherproof Coat', category: 'apparel', subtitle: 'Waxed, fleece-lined coat', price: 92, compareAt: 118, tag: 'Sale', featured: 0, bestSeller: 1, img: 'coat', alt: 'ugc4',
    colors: [['Olive', '#6B6B4A'], ['Camel', '#BCAB90'], ['Ink', '#1B1915']], sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 15 },
  { slug: 'city-rope-lead', title: 'City Rope Lead', category: 'walking', subtitle: 'Braided rope, leather trim', price: 44, compareAt: null, tag: 'New', featured: 0, bestSeller: 1, img: 'lead', alt: 'ugc6',
    colors: [['Sand', '#DED0BB'], ['Clay', '#A9764F'], ['Slate', '#5A5A52']], sizes: ['One Size'], stock: 40 },
  { slug: 'sunday-linen-bandana', title: 'Sunday Linen Bandana', category: 'accessories', subtitle: 'Washed linen, tie-on', price: 28, compareAt: null, tag: '', featured: 0, bestSeller: 0, img: 'bandana', alt: 'ugc5',
    colors: [['Cream', '#F4EDE1'], ['Rust', '#A9764F'], ['Sage', '#8B9A7B']], sizes: ['S', 'M', 'L'], stock: 50 },
  { slug: 'nap-nest-bolster-bed', title: 'Nap Nest Bolster Bed', category: 'beds', subtitle: 'Plush recycled-fill bed', price: 148, compareAt: 175, tag: 'Sale', featured: 0, bestSeller: 0, img: 'bed', alt: 'story',
    colors: [['Oat', '#DED0BB'], ['Clay', '#A9764F'], ['Charcoal', '#34302A']], sizes: ['S', 'M', 'L'], stock: 9 },
  { slug: 'duo-matching-scarf-set', title: 'Duo Matching Scarf Set', category: 'matching', subtitle: 'Human + pet scarf duo', price: 68, compareAt: null, tag: 'New', featured: 1, bestSeller: 0, img: 'matching', alt: 'ugc4',
    colors: [['Camel', '#BCAB90'], ['Ivory', '#F4EDE1'], ['Rust', '#A9764F']], sizes: ['S/M', 'L/XL'], stock: 20 },
  { slug: 'field-paw-protectors', title: 'Field Paw Protectors', category: 'walking', subtitle: 'All-terrain grip boots', price: 56, compareAt: null, tag: '', featured: 0, bestSeller: 0, img: 'lead', alt: 'harness',
    colors: [['Sand', '#DED0BB'], ['Black', '#1B1915']], sizes: ['XS', 'S', 'M', 'L'], stock: 22 },
  { slug: 'cashmere-blend-throw', title: 'Cashmere-Blend Throw', category: 'beds', subtitle: 'Featherlight knit throw', price: 84, compareAt: null, tag: '', featured: 0, bestSeller: 0, img: 'bed', alt: 'knit',
    colors: [['Cream', '#F4EDE1'], ['Taupe', '#BCAB90'], ['Clay', '#A9764F']], sizes: ['M', 'L'], stock: 16 },
  { slug: 'explorer-brass-id-tag', title: 'Explorer Brass ID Tag', category: 'accessories', subtitle: 'Engravable solid brass tag', price: 34, compareAt: null, tag: '', featured: 0, bestSeller: 0, img: 'accessories', alt: 'bandana',
    colors: [['Brass', '#C6A15B'], ['Silver', '#C9C6C0'], ['Matte Black', '#1B1915']], sizes: ['S', 'M', 'L'], stock: 35 },
];

const REVIEWS = [
  { slug: 'aspen-merino-knit', name: 'Maya R.', rating: 5, title: 'Compliments on every walk', body: 'The knit fits Biscuit like it was made for him. Beautiful quality and so soft.', verified: 1 },
  { slug: 'aspen-merino-knit', name: 'Daniel K.', rating: 5, title: 'Worth every penny', body: 'Treats our dog like family. Impeccable stitching.', verified: 1 },
  { slug: 'trailhead-adventure-harness', name: 'Sofia L.', rating: 5, title: 'No more pulling', body: 'Secure, comfortable and gorgeous. Best harness we have owned.', verified: 1 },
  { slug: 'cloud-orthopedic-lounger', name: 'James P.', rating: 5, title: 'Only bed she hasn’t destroyed', body: 'Beautiful in our living room and Nova sleeps through the night now.', verified: 1 },
  { slug: 'heritage-leather-collar', name: 'Priya S.', rating: 4, title: 'Stunning leather', body: 'Ages beautifully. Runs slightly large — size down.', verified: 1 },
  { slug: 'storm-weatherproof-coat', name: 'Ethan M.', rating: 5, title: 'Unreal winter coat', body: 'Kept Leo dry through a downpour. Premium feel throughout.', verified: 1 },
];

const seed = db.transaction(() => {
  // Wipe catalogue-related tables (keep users/orders/settings/newsletter/contact).
  db.exec(`DELETE FROM reviews; DELETE FROM product_images; DELETE FROM variants; DELETE FROM products; DELETE FROM categories; DELETE FROM coupons;`);

  // Admin
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(config.admin.email);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(config.admin.password, 12);
    db.prepare("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, 'Store Admin', 'admin')").run(config.admin.email, hash);
  } else {
    db.prepare("UPDATE users SET role='admin' WHERE id = ?").run(existingAdmin.id);
  }

  // Categories
  const catId = {};
  const insCat = db.prepare('INSERT INTO categories (slug,name,description,image,position) VALUES (?,?,?,?,?)');
  CATEGORIES.forEach((c, i) => { const info = insCat.run(c.slug, c.name, c.description, c.image, i); catId[c.slug] = info.lastInsertRowid; });

  // Products + variants + images
  const insProd = db.prepare(`INSERT INTO products (slug,title,category_id,subtitle,description,details,price_cents,compare_at_cents,status,featured,best_seller,tag,seo_title,seo_description,position)
    VALUES (@slug,@title,@category_id,@subtitle,@description,@details,@price_cents,@compare_at_cents,'active',@featured,@best_seller,@tag,@seo_title,@seo_description,@position)`);
  const insImg = db.prepare('INSERT INTO product_images (product_id,url,srcset_json,alt,position) VALUES (?,?,?,?,?)');
  const insVar = db.prepare('INSERT INTO variants (product_id,sku,color,color_hex,size,price_cents,stock,low_stock_at,position) VALUES (?,?,?,?,?,?,?,?,?)');

  const prodId = {};
  PRODUCTS.forEach((p, pi) => {
    const desc = `Designed in-house and comfort-tested by real dogs, the ${p.title} brings considered detail and enduring quality to everyday life with your best friend.`;
    const details = 'Crafted from responsibly sourced, OEKO-TEX® certified materials with reinforced construction. Nine size grades and adjustable fits. Machine washable, cold. Designed in Portland.';
    const info = insProd.run({
      slug: p.slug, title: p.title, category_id: catId[p.category], subtitle: p.subtitle,
      description: desc, details, price_cents: Math.round(p.price * 100),
      compare_at_cents: p.compareAt ? Math.round(p.compareAt * 100) : null,
      featured: p.featured, best_seller: p.bestSeller, tag: p.tag,
      seo_title: `${p.title} — Loomipaw`, seo_description: p.subtitle, position: pi,
    });
    const id = info.lastInsertRowid; prodId[p.slug] = id;
    const main = img(p.img, p.title); const alt = img(p.alt, p.title);
    insImg.run(id, main.url, JSON.stringify(main.srcset), main.alt, 0);
    insImg.run(id, alt.url, JSON.stringify(alt.srcset), alt.alt, 1);

    let vpos = 0;
    for (const [color, hex] of p.colors) {
      for (const size of p.sizes) {
        const sku = `${p.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${color.slice(0, 3).toUpperCase()}-${slugify(size).toUpperCase() || 'OS'}`;
        // distribute stock across variants
        const stock = Math.max(2, Math.round(p.stock / (p.colors.length * p.sizes.length)) + (vpos % 3));
        insVar.run(id, sku, color, hex, size, null, stock, 5, vpos++);
      }
    }
  });

  // Reviews — seed a genuine corpus so rating counts are real and stay
  // consistent when new reviews are approved/removed.
  const insRev = db.prepare("INSERT INTO reviews (product_id,author_name,rating,title,body,status,verified,created_at) VALUES (?,?,?,?,?,'approved',?,datetime('now', ?))");
  for (const r of REVIEWS) insRev.run(prodId[r.slug], r.name, r.rating, r.title, r.body, r.verified, '-10 day');

  const NAMES = ['Maya R.', 'James P.', 'Sofia L.', 'Daniel K.', 'Priya S.', 'Ethan M.', 'Amara T.', 'Marco D.', 'Lena V.', 'Noah B.', 'Chloe W.', 'Ravi N.', 'Isla F.', 'Theo G.', 'Nina K.', 'Omar H.', 'Grace L.', 'Felix J.', 'Aria S.', 'Ben C.'];
  const TITLES = ['Exceptional quality', 'Worth every penny', 'Perfect fit', 'Beautifully made', 'Our new favourite', 'Compliments everywhere', 'So well designed', 'Premium feel', 'Highly recommend', 'Better than expected'];
  const BODIES = [
    'You can feel the craftsmanship the moment you unbox it. My dog is comfortable and I get stopped on every walk.',
    'I have bought cheaper before and replaced them within weeks. This is on another level — beautiful and built to last.',
    'The sizing guide was spot on. Secure, comfortable and my pup actually loves wearing it.',
    'Gorgeous materials and thoughtful details throughout. Exactly what I hoped for.',
    'Fast shipping and the quality is outstanding. Will absolutely order again.',
    'Treats our dogs like family. The finish and stitching are impeccable.',
    'Looks stunning in our home and holds up to daily use. No complaints at all.',
    'Elegant, durable and clearly made with care. Worth the investment.',
  ];
  // Reproducible pseudo-random so seeds are stable across runs.
  let seedN = 1337; const rnd = () => (seedN = (seedN * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const REVIEW_VOLUME = { 'aspen-merino-knit': 84, 'trailhead-adventure-harness': 123, 'cloud-orthopedic-lounger': 61, 'heritage-leather-collar': 45, 'storm-weatherproof-coat': 53, 'city-rope-lead': 39, 'duo-matching-scarf-set': 18, 'sunday-linen-bandana': 22, 'nap-nest-bolster-bed': 27, 'field-paw-protectors': 15, 'cashmere-blend-throw': 24, 'explorer-brass-id-tag': 30 };
  for (const [slug, count] of Object.entries(REVIEW_VOLUME)) {
    for (let i = 0; i < count; i++) {
      // Weighted toward 5★ (≈88% 5, 9% 4, 3% ≤3)
      const roll = rnd();
      const rating = roll < 0.88 ? 5 : roll < 0.97 ? 4 : (roll < 0.99 ? 3 : 2);
      insRev.run(prodId[slug], pick(NAMES), rating, pick(TITLES), pick(BODIES), rnd() < 0.85 ? 1 : 0, `-${Math.floor(rnd() * 300)} day`);
    }
  }
  // Compute cached rating from the real corpus for every product.
  for (const slug of Object.keys(prodId)) {
    const row = db.prepare("SELECT COUNT(*) n, COALESCE(AVG(rating),0) a FROM reviews WHERE product_id=? AND status='approved'").get(prodId[slug]);
    db.prepare('UPDATE products SET rating_avg=?, rating_count=? WHERE id=?').run(Math.round(row.a * 10) / 10, row.n, prodId[slug]);
  }

  // Coupons
  const insCoupon = db.prepare('INSERT INTO coupons (code,type,value,min_subtotal_cents,free_shipping,active,usage_limit) VALUES (?,?,?,?,?,1,?)');
  insCoupon.run('WELCOME10', 'percent', 10, 0, 0, 0);
  insCoupon.run('PAWS20', 'percent', 20, 10000, 0, 0);
  insCoupon.run('FREESHIP', 'fixed', 0, 5000, 1, 0);

  // Default settings snapshot
  settings.set('store', settings.get('store'));
  settings.set('shipping', settings.get('shipping'));
  settings.set('tax', settings.get('tax'));
  settings.set('payments', { provider: config.payments.provider });
});

if (require.main === module) {
  require('./migrate')();
  seed();
  const counts = {
    products: db.prepare('SELECT COUNT(*) n FROM products').get().n,
    variants: db.prepare('SELECT COUNT(*) n FROM variants').get().n,
    categories: db.prepare('SELECT COUNT(*) n FROM categories').get().n,
    coupons: db.prepare('SELECT COUNT(*) n FROM coupons').get().n,
  };
  console.log('✓ Seed complete:', counts);
  console.log(`✓ Admin login: ${config.admin.email} / ${config.admin.password}`);
}

module.exports = seed;
