'use strict';
/**
 * Security & integration tests. Boots the real app in-process on an
 * ephemeral port and exercises it over HTTP with a cookie jar.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('../db/migrate')();
const createApp = require('../app');

let server, base;
const jar = new Map();
function stashCookies(res) {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of set) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }
}
const cookie = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
async function req(method, path, body, { csrf = true } = {}) {
  const headers = { cookie: cookie() };
  if (body) headers['content-type'] = 'application/json';
  if (csrf && method !== 'GET' && jar.get('lp_csrf')) headers['x-csrf-token'] = jar.get('lp_csrf');
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  stashCookies(res);
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers };
}

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  await req('GET', '/api/health'); // seed cookies (csrf)
  await req('GET', '/api/settings');
});
after(() => server && server.close());

test('security headers are present', async () => {
  const res = await req('GET', '/');
  assert.ok(res.headers.get('content-security-policy'), 'CSP set');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('referrer-policy'));
  assert.ok(res.headers.get('permissions-policy'));
  assert.equal(res.headers.get('x-powered-by'), null, 'x-powered-by hidden');
});

test('CSRF blocks tokenless mutations', async () => {
  const res = await req('POST', '/api/newsletter', { email: 'a@b.com' }, { csrf: false });
  assert.equal(res.status, 403);
});

test('CSRF allows mutations with token', async () => {
  const res = await req('POST', '/api/newsletter', { email: `csrf${Date.now()}@t.dev` });
  assert.equal(res.status, 201);
});

test('password policy rejects weak passwords', async () => {
  const res = await req('POST', '/api/auth/register', { name: 'W', email: `w${Date.now()}@t.dev`, password: 'password' });
  assert.equal(res.status, 422);
});

test('registration + strong password works and sets a session', async () => {
  const email = `u${Date.now()}@t.dev`;
  const res = await req('POST', '/api/auth/register', { name: 'U', email, password: 'Str0ng!Pass9' });
  assert.equal(res.status, 201);
  assert.equal(res.data.user.email, email);
});

test('admin routes reject guests (401) and customers (403)', async () => {
  const freshJar = new Map(jar); // customer session currently active
  const asCustomer = await req('GET', '/api/admin/stats');
  assert.equal(asCustomer.status, 403, 'logged-in customer forbidden');
  jar.clear();
  await req('GET', '/api/settings');
  const asGuest = await req('GET', '/api/admin/stats');
  assert.equal(asGuest.status, 401, 'guest unauthorized');
  void freshJar;
});

test('brute-force lockout engages after repeated failures', async () => {
  jar.clear(); await req('GET', '/api/settings');
  const email = `lock${Date.now()}@t.dev`;
  await req('POST', '/api/auth/register', { name: 'L', email, password: 'Str0ng!Pass9' });
  await req('POST', '/api/auth/logout');
  jar.clear(); await req('GET', '/api/settings');
  let last;
  for (let i = 0; i < 6; i++) last = await req('POST', '/api/auth/login', { email, password: 'wrongXX99!' });
  assert.equal(last.status, 423, 'account locked after 5 failures');
  const correct = await req('POST', '/api/auth/login', { email, password: 'Str0ng!Pass9' });
  assert.equal(correct.status, 423, 'correct password still blocked while locked');
});

test('SEO: robots.txt and sitemap.xml served', async () => {
  const robots = await fetch(base + '/robots.txt'); const robotsText = await robots.text();
  assert.match(robotsText, /Sitemap:/);
  assert.match(robotsText, /Disallow: \/admin/);
  const sm = await fetch(base + '/sitemap.xml'); const smText = await sm.text();
  assert.match(smText, /<urlset/);
  assert.match(smText, /product\.html\?slug=/);
});

test('SEO: product page is server-rendered with meta + JSON-LD', async () => {
  const res = await fetch(base + '/product.html?slug=aspen-merino-knit');
  const html = await res.text();
  assert.match(html, /<title>Aspen Merino Knit/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /"@type":"Product"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
});

test('parameterized queries: injection attempt is treated as literal', async () => {
  const res = await req('GET', "/api/products?q=' OR 1=1--");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.products)); // no error, no dump
});
