'use strict';
/**
 * Full customer-journey simulation (in-process, ephemeral port).
 * Drives the real app through a complete shopper + admin lifecycle and prints
 * a PASS/FAIL line per step. Run: node scripts/journey-sim.js
 * Used to generate CUSTOMER_JOURNEY_TEST_REPORT.md.
 */
require('../server/db/migrate')();
const createApp = require('../server/app');
const config = require('../server/config');
const fs = require('fs');

const jar = new Map();
let base;
function stash(res) { (res.headers.getSetCookie ? res.headers.getSetCookie() : []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }); }
const cookie = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
async function api(method, path, body) {
  const headers = { cookie: cookie() };
  if (body) headers['content-type'] = 'application/json';
  if (method !== 'GET' && jar.get('lp_csrf')) headers['x-csrf-token'] = jar.get('lp_csrf');
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  stash(res);
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, res };
}

const results = [];
function check(step, cond, detail = '') { results.push({ step, ok: !!cond, detail }); console.log(`${cond ? '✓ PASS' : '✗ FAIL'}  ${step}${detail ? '  — ' + detail : ''}`); }

(async () => {
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const email = `journey${Date.now()}@test.dev`;
  await api('GET', '/api/settings');

  // 1. Land on homepage
  const home = await fetch(base + '/'); check('1. Lands on homepage', home.status === 200, `HTTP ${home.status}`);

  // 2. Register + view a product
  await api('POST', '/api/auth/register', { name: 'Journey Shopper', email, password: 'Str0ng!Pass9' });
  const detail = await api('GET', '/api/products/aspen-merino-knit');
  const v = detail.data.product.variants.find((x) => x.inStock);
  check('2. Views product', detail.status === 200 && !!v, detail.data.product.title);

  // 3. Add product to cart
  const add = await api('POST', '/api/cart/items', { variantId: v.id, qty: 1 });
  check('3. Adds product to cart', add.data.cart.count === 1);

  // 4. Uses discount code
  const cp = await api('POST', '/api/cart/coupon', { code: 'WELCOME10' });
  check('4. Uses discount code (WELCOME10)', cp.data.cart.discountCents === Math.round(cp.data.cart.subtotalCents * 0.1), `−${(cp.data.cart.discountCents / 100).toFixed(2)}`);

  // 5. Uses upsell (add a complementary product — the FBT/cart-upsell path)
  const acc = (await api('GET', '/api/products?category=accessories&sort=reviews&limit=6')).data.products.find((p) => p.inStock);
  const av = (await api('GET', '/api/products/' + acc.slug)).data.product.variants.find((x) => x.inStock);
  const up = await api('POST', '/api/cart/items', { variantId: av.id, qty: 1 });
  check('5. Uses upsell (adds complementary item)', up.data.cart.count === 2, `${acc.title} added`);

  // 6. Completes checkout
  const addr = { name: 'Journey Shopper', address1: '1 Rd', city: 'Portland', region: 'OR', postal: '97201', country: 'USA' };
  const co = await api('POST', '/api/checkout', { email, shipping: addr, coupon: 'WELCOME10', payment: { cardNumber: '4242 4242 4242 4242' } });
  const orderNumber = co.data.order && co.data.order.number;
  check('6. Completes checkout', co.status === 201 && /^LP-/.test(orderNumber || ''), orderNumber);
  check('6b. Cart cleared after purchase', (await api('GET', '/api/cart')).data.cart.count === 0);

  // 7. Receives order email (dev transport writes .eml)
  const mails = fs.existsSync(config.paths.mail) ? fs.readdirSync(config.paths.mail) : [];
  check('7. Receives order confirmation email', mails.some((f) => /confirmed|order/i.test(f)), `${mails.length} mail file(s)`);

  // 8. Views order history
  const hist = await api('GET', '/api/orders');
  const histOrder = hist.data.orders.find((o) => o.number === orderNumber);
  check('8. Views order history', !!histOrder && histOrder.financial_status === 'paid');

  // 9. Requests support (contact form)
  const support = await api('POST', '/api/contact', { name: 'Journey Shopper', email, subject: 'Question about my order', message: 'When will my order ship?' });
  check('9. Requests support (contact form)', support.status === 201);

  // ---- Admin side: shipping update + refund ----
  jar.clear(); await api('GET', '/api/settings');
  await api('POST', '/api/auth/login', { email: config.admin.email, password: config.admin.password });

  // 10. Receives shipping update (admin ships → customer email)
  const ship = await api('PATCH', '/api/admin/orders/' + orderNumber, { status: 'shipped', tracking: 'TRK-SIM-1' });
  check('10. Receives shipping update', ship.data.order.status === 'shipped' && ship.data.order.tracking_number === 'TRK-SIM-1');

  // 11. Requests refund (admin executes; stock restored)
  const beforeStock = (await api('GET', '/api/products/aspen-merino-knit')).data.product.variants.find((x) => x.id === v.id).stock;
  const refund = await api('POST', '/api/admin/orders/' + orderNumber + '/refund', {});
  const afterStock = (await api('GET', '/api/products/aspen-merino-knit')).data.product.variants.find((x) => x.id === v.id).stock;
  check('11. Refund processed + stock restored', refund.status === 200 && refund.data.order.status === 'refunded' && afterStock === beforeStock + 1);

  server.close();
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} steps passed.`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('SIM ERROR', e); process.exit(1); });
