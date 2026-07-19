'use strict';
/**
 * End-to-end API smoke test against a running server.
 * Exercises the full commerce flow with a real cookie jar + CSRF handling.
 * Usage: BASE=http://localhost:4000 node server/test/e2e.js
 */
const BASE = process.env.BASE || 'http://localhost:4000';

const jar = new Map();
function setCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.raw?.()['set-cookie'] || []);
  for (const c of raw) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }
}
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

async function api(method, path, body, opts = {}) {
  const headers = { 'content-type': 'application/json', cookie: cookieHeader() };
  const csrf = jar.get('lp_csrf');
  if (csrf && method !== 'GET') headers['x-csrf-token'] = csrf;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  setCookies(res);
  let data = null; try { data = await res.json(); } catch {}
  if (!opts.allowFail && !res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return { status: res.status, data };
}

let passed = 0, failed = 0;
function check(name, cond, extra) { if (cond) { passed++; console.log('  ✓', name); } else { failed++; console.log('  ✗', name, extra || ''); } }

(async () => {
  console.log('Loomipaw E2E —', BASE);

  // 0) bootstrap CSRF cookie
  await api('GET', '/api/settings');
  check('CSRF cookie issued', !!jar.get('lp_csrf'));

  // 1) products
  const list = await api('GET', '/api/products?limit=50');
  check('product catalogue', list.data.pagination.total === 12, list.data.pagination);
  const filtered = await api('GET', '/api/products?category=beds&sort=price-desc');
  check('category filter + sort', filtered.data.products.length === 3 && filtered.data.products[0].price >= filtered.data.products[2].price);
  const search = await api('GET', '/api/search?q=harness');
  check('search', search.data.results.length >= 1);

  const detail = await api('GET', '/api/products/aspen-merino-knit');
  check('product detail + variants', detail.data.product.variants.length > 0 && detail.data.related.length === 4);
  const variant = detail.data.product.variants.find((v) => v.inStock);

  // 2) register (new user each run)
  const email = `test${Date.now()}@loomipaw.dev`;
  const reg = await api('POST', '/api/auth/register', { name: 'Test Buyer', email, password: 'Sup3rSecret!' });
  check('register + session', reg.status === 201 && reg.data.user.email === email);
  const me = await api('GET', '/api/auth/me');
  check('session persists', me.data.user && me.data.user.email === email);

  // 3) cart
  await api('POST', '/api/cart/items', { variantId: variant.id, qty: 2 });
  const cart = await api('GET', '/api/cart');
  check('cart add + price', cart.data.cart.count === 2 && cart.data.cart.subtotalCents === variant.priceCents * 2, cart.data.cart);

  // 4) coupon
  const coupon = await api('POST', '/api/cart/coupon', { code: 'WELCOME10' });
  check('coupon applies 10%', coupon.data.cart.discountCents === Math.round(coupon.data.cart.subtotalCents * 0.1), coupon.data.cart.discountCents);

  // 5) wishlist
  await api('POST', '/api/wishlist', { productId: detail.data.product.id });
  const wl = await api('GET', '/api/wishlist');
  check('wishlist', wl.data.items.length === 1);

  // 6) checkout — declined card
  const addr = { name: 'Test Buyer', address1: '1 Aspen Row', city: 'Portland', region: 'OR', postal: '97201', country: 'USA' };
  const declined = await api('POST', '/api/checkout', { email, shipping: addr, payment: { cardNumber: '4000 0000 0000 0002' } }, { allowFail: true });
  check('declined card rejected + restock', declined.status === 402, declined.data);

  // cart should still have items after failure
  const cartAfterFail = await api('GET', '/api/cart');
  check('cart preserved after decline', cartAfterFail.data.cart.count === 2);

  // 7) checkout — success
  const ok = await api('POST', '/api/checkout', { email, shipping: addr, coupon: 'WELCOME10', payment: { cardNumber: '4242 4242 4242 4242' } });
  check('successful checkout', ok.status === 201 && ok.data.order.number, ok.data);
  const orderNumber = ok.data.order.number;

  const emptyCart = await api('GET', '/api/cart');
  check('cart cleared after order', emptyCart.data.cart.count === 0);

  // 8) order history
  const orders = await api('GET', '/api/orders');
  check('order in history', orders.data.orders.some((o) => o.number === orderNumber));

  // 9) stock decremented
  const detail2 = await api('GET', '/api/products/aspen-merino-knit');
  const v2 = detail2.data.product.variants.find((v) => v.id === variant.id);
  check('stock decremented', v2.stock === variant.stock - 2, { before: variant.stock, after: v2.stock });

  // 10) submit review
  const rev = await api('POST', '/api/reviews/product/aspen-merino-knit', { rating: 5, title: 'Great', body: 'Excellent quality product.' });
  check('review submitted (pending)', rev.status === 201);

  // 11) admin login + actions
  jar.clear();
  await api('GET', '/api/settings');
  const adminLogin = await api('POST', '/api/auth/login', { email: process.env.ADMIN_EMAIL || 'admin@loomipaw.com', password: process.env.ADMIN_PASSWORD || 'Admin123!change' });
  check('admin login', adminLogin.data.user.role === 'admin');

  const stats = await api('GET', '/api/admin/stats');
  check('admin stats', stats.data.stats.orders >= 1 && stats.data.stats.revenueCents > 0, stats.data.stats);

  const adminOrders = await api('GET', '/api/admin/orders');
  check('admin sees order', adminOrders.data.orders.some((o) => o.number === orderNumber));

  const fulfil = await api('PATCH', `/api/admin/orders/${orderNumber}`, { status: 'shipped', tracking: 'TRK123' });
  check('admin fulfils order', fulfil.data.order.status === 'shipped' && fulfil.data.order.tracking_number === 'TRK123');

  // approve the pending review
  const pending = await api('GET', '/api/admin/reviews?status=pending');
  const newReview = pending.data.reviews.find((r) => r.title === 'Great');
  await api('PATCH', `/api/admin/reviews/${newReview.id}`, { status: 'approved' });
  const detail3 = await api('GET', '/api/products/aspen-merino-knit');
  check('review approved raises count', detail3.data.reviewSummary.count > detail2.data.reviewSummary.count);

  // create a product via admin
  const created = await api('POST', '/api/admin/products', { title: 'Test Widget', price: 19.99, variants: [{ color: 'Red', size: 'S', stock: 5 }] });
  check('admin creates product', created.status === 201 && created.data.product.slug);
  await api('DELETE', `/api/admin/products/${created.data.product.id}`);
  check('admin deletes product', true);

  // create coupon
  const cpn = await api('POST', '/api/admin/coupons', { code: `TEST${Date.now()}`, type: 'percent', value: 15 });
  check('admin creates coupon', cpn.status === 201);

  // update settings
  const setRes = await api('PUT', '/api/admin/settings', { tax: { ratePercent: 7.25 } });
  check('admin updates settings', setRes.data.settings.tax.ratePercent === 7.25);
  await api('PUT', '/api/admin/settings', { tax: { ratePercent: 8.5 } }); // restore

  // 12) CSRF protection works (missing token blocked)
  const noCsrf = await fetch(BASE + '/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookieHeader() }, body: JSON.stringify({ email: 'x@y.com' }) });
  check('CSRF blocks tokenless mutation', noCsrf.status === 403, noCsrf.status);

  console.log(`\n${failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES'} — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('\n✗ E2E crashed:', e.message); process.exit(1); });
