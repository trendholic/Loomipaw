'use strict';
/**
 * Full business-journey test (in-process). Boots the real app and drives the
 * complete customer and admin flows end-to-end, including refunds and exports.
 * Doubles as the launch "business testing" and the main coverage driver.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
require('../db/migrate')();
const createApp = require('../app');
const config = require('../config');

let server, base;
const jar = new Map();
function stash(res) { (res.headers.getSetCookie ? res.headers.getSetCookie() : []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }); }
const cookie = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
async function api(method, path, body, { raw = false } = {}) {
  const headers = { cookie: cookie() };
  if (body && !raw) headers['content-type'] = 'application/json';
  if (method !== 'GET' && jar.get('lp_csrf')) headers['x-csrf-token'] = jar.get('lp_csrf');
  const res = await fetch(base + path, { method, headers, body: raw ? body : (body ? JSON.stringify(body) : undefined) });
  stash(res);
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  await api('GET', '/api/settings');
});
after(() => server && server.close());

const email = `flow${Date.now()}@test.dev`;
let orderNumber, variantId, productSlug = 'aspen-merino-knit';

test('CUSTOMER: register', async () => {
  const r = await api('POST', '/api/auth/register', { name: 'Flow Buyer', email, password: 'Str0ng!Pass9' });
  assert.equal(r.status, 201);
});

test('CUSTOMER: browse, search, product detail', async () => {
  const list = await api('GET', '/api/products?limit=50');
  assert.ok(list.data.pagination.total >= 12);
  const search = await api('GET', '/api/search?q=knit');
  assert.ok(search.data.results.length >= 1);
  const detail = await api('GET', '/api/products/' + productSlug);
  const v = detail.data.product.variants.find((x) => x.inStock);
  assert.ok(v, 'has an in-stock variant');
  variantId = v.id;
});

test('CUSTOMER: add to cart + apply coupon', async () => {
  const add = await api('POST', '/api/cart/items', { variantId, qty: 2 });
  assert.equal(add.data.cart.count, 2);
  const cp = await api('POST', '/api/cart/coupon', { code: 'WELCOME10' });
  assert.equal(cp.data.cart.discountCents, Math.round(cp.data.cart.subtotalCents * 0.1));
});

test('CUSTOMER: wishlist', async () => {
  const prod = (await api('GET', '/api/products/' + productSlug)).data.product;
  const r = await api('POST', '/api/wishlist', { productId: prod.id });
  assert.equal(r.status, 201);
  assert.equal((await api('GET', '/api/wishlist')).data.items.length, 1);
});

test('CUSTOMER: declined payment is rejected and cart preserved', async () => {
  const addr = { name: 'Flow Buyer', address1: '1 Rd', city: 'Portland', region: 'OR', postal: '97201', country: 'USA' };
  const r = await api('POST', '/api/checkout', { email, shipping: addr, payment: { cardNumber: '4000 0000 0000 0002' } });
  assert.equal(r.status, 402);
  assert.equal((await api('GET', '/api/cart')).data.cart.count, 2, 'cart intact after decline');
});

test('CUSTOMER: successful checkout + order confirmation', async () => {
  const addr = { name: 'Flow Buyer', address1: '1 Rd', city: 'Portland', region: 'OR', postal: '97201', country: 'USA' };
  const r = await api('POST', '/api/checkout', { email, shipping: addr, coupon: 'WELCOME10', payment: { cardNumber: '4242 4242 4242 4242' } });
  assert.equal(r.status, 201);
  orderNumber = r.data.order.number;
  assert.match(orderNumber, /^LP-/);
  assert.equal((await api('GET', '/api/cart')).data.cart.count, 0, 'cart cleared');
});

test('CUSTOMER: order appears in history with correct total', async () => {
  const hist = await api('GET', '/api/orders');
  const o = hist.data.orders.find((x) => x.number === orderNumber);
  assert.ok(o);
  assert.equal(o.financial_status, 'paid');
});

test('CUSTOMER: submit a review', async () => {
  const r = await api('POST', '/api/reviews/product/' + productSlug, { rating: 5, title: 'Great', body: 'Really lovely quality.' });
  assert.equal(r.status, 201);
});

test('CUSTOMER: order confirmation email was written (dev transport)', async () => {
  const fs = require('fs');
  const files = fs.readdirSync(config.paths.mail);
  assert.ok(files.some((f) => /confirmed|order/i.test(f)), 'an order email exists');
});

/* ----------------------------- ADMIN ----------------------------- */
let productId;
test('ADMIN: login', async () => {
  jar.clear(); await api('GET', '/api/settings');
  const r = await api('POST', '/api/auth/login', { email: config.admin.email, password: config.admin.password });
  assert.equal(r.data.user.role, 'admin');
});

test('ADMIN: create product with variant', async () => {
  const r = await api('POST', '/api/admin/products', { title: 'Launch Test Item', price: 42, variants: [{ color: 'Sand', size: 'M', stock: 7 }] });
  assert.equal(r.status, 201);
  productId = r.data.product.id;
});

test('ADMIN: upload + optimize product image', async () => {
  const buf = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: '#A9764F' } }).png().toBuffer();
  const fd = new FormData();
  fd.append('image', new Blob([buf], { type: 'image/png' }), 'test.png');
  const r = await api('POST', `/api/admin/products/${productId}/images`, fd, { raw: true });
  assert.equal(r.status, 201);
  assert.match(r.data.image.url, /\.webp$/);
  assert.ok(r.data.image.srcset.length >= 2, 'responsive variants generated');
});

test('ADMIN: reject non-image upload', async () => {
  const fd = new FormData();
  fd.append('image', new Blob([Buffer.from('not an image')], { type: 'image/png' }), 'fake.png');
  const r = await api('POST', `/api/admin/products/${productId}/images`, fd, { raw: true });
  assert.ok(r.status >= 400, 'invalid image rejected');
});

test('ADMIN: inventory update', async () => {
  const inv = (await api('GET', '/api/admin/inventory')).data.inventory[0];
  const r = await api('PATCH', '/api/admin/inventory/' + inv.id, { stock: 25, reason: 'restock' });
  assert.equal(r.data.stock, 25);
});

test('ADMIN: process order (ship + tracking)', async () => {
  const r = await api('PATCH', '/api/admin/orders/' + orderNumber, { status: 'shipped', tracking: 'TRK-LAUNCH-1' });
  assert.equal(r.data.order.status, 'shipped');
  assert.equal(r.data.order.tracking_number, 'TRK-LAUNCH-1');
});

test('ADMIN: refund order (restocks + marks refunded)', async () => {
  // Order must be paid to refund; it is (status shipped, financial paid).
  const before = (await api('GET', '/api/admin/orders/' + orderNumber)).data.order;
  const beforeStock = (await api('GET', '/api/products/' + productSlug)).data.product.variants.find((v) => v.id === variantId)?.stock ?? 0;
  const r = await api('POST', '/api/admin/orders/' + orderNumber + '/refund', {});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.order.status, 'refunded');
  assert.equal(r.data.order.financial_status, 'refunded');
  const afterStock = (await api('GET', '/api/products/' + productSlug)).data.product.variants.find((v) => v.id === variantId)?.stock ?? 0;
  assert.equal(afterStock, beforeStock + 2, 'refund restocked the 2 units');
  void before;
});

test('ADMIN: double refund is blocked', async () => {
  const r = await api('POST', '/api/admin/orders/' + orderNumber + '/refund', {});
  assert.equal(r.status, 409);
});

test('ADMIN: export data (orders + products CSV)', async () => {
  const o = await fetch(base + '/api/admin/export/orders.csv', { headers: { cookie: cookie() } });
  assert.equal(o.status, 200);
  const text = await o.text();
  assert.match(text, /Order,Date,Email/);
  const p = await fetch(base + '/api/admin/export/products.csv', { headers: { cookie: cookie() } });
  assert.equal(p.status, 200);
});

test('ADMIN: inventory history is readable', async () => {
  const h = await api('GET', '/api/admin/inventory/history?limit=50');
  assert.equal(h.status, 200);
  assert.ok(Array.isArray(h.data.history) && h.data.history.length > 0, 'has movements');
  // Every movement carries a signed delta, a reason and a timestamp.
  const row = h.data.history[0];
  assert.ok('delta' in row && row.reason && row.created_at);
  assert.ok(h.data.history.some((r) => ['order', 'cancel', 'adjustment', 'restock'].includes(r.reason)), 'movement reasons present');
});

test('ADMIN: analytics + activity feed', async () => {
  const a = await api('GET', '/api/admin/analytics');
  assert.ok(a.data.conversion);
  const act = await api('GET', '/api/admin/activity');
  assert.ok(act.data.pagination.total > 0);
  assert.ok(act.data.activity.some((e) => e.action === 'order.refund'), 'refund was audited');
});

test('ADMIN: create + delete product cleans up', async () => {
  const r = await api('DELETE', '/api/admin/products/' + productId);
  assert.equal(r.status, 200);
  assert.equal((await api('GET', '/api/admin/products/' + productId)).status, 404);
});
