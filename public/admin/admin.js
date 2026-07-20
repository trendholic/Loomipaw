/* =====================================================================
   Loomipaw Admin — single-page dashboard.
   Auth gate → sidebar router → data views (products, orders, customers,
   inventory, coupons, categories, reviews, messages, settings).
   ===================================================================== */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const root = document.getElementById('admin-root');
  const admin = (p) => '/admin' + p;
  const money = (c, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format((c || 0) / 100);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (s) => new Date((s || '').includes('Z') ? s : s + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDateTime = (s) => new Date((s || '').includes('Z') ? s : s + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  let user = null;
  let counts = {};

  /* ---------------------------------------------------- Toast --------- */
  let tT;
  function toast(msg, kind) {
    const el = document.querySelector('[data-toast]');
    el.textContent = msg; el.classList.toggle('is-error', kind === 'error'); el.classList.add('is-visible');
    clearTimeout(tT); tT = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  /* ---------------------------------------------------- Boot ---------- */
  boot();
  async function boot() {
    try { const me = await API.me(); user = me.user; } catch (_) {}
    if (!user || user.role !== 'admin') return renderLogin();
    renderShell();
    window.addEventListener('hashchange', route);
    route();
  }

  /* ---------------------------------------------------- Login --------- */
  function renderLogin(msg) {
    root.innerHTML = `
      <div class="admin-login"><div class="admin-login__card">
        <span class="brand">Loomi<b>paw</b></span>
        <h1>Admin sign in</h1><p>Sign in with your administrator account.</p>
        <div data-alert>${msg ? `<div class="alert alert--error">${esc(msg)}</div>` : ''}</div>
        <form data-login class="form-grid">
          <div class="form-field"><label>Email</label><input name="email" type="email" required></div>
          <div class="form-field"><label>Password</label><input name="password" type="password" required></div>
          <button class="btn" style="width:100%;justify-content:center" type="submit">Sign in</button>
        </form>
      </div></div>`;
    document.querySelector('[data-login]').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      try {
        const res = await API.login(fd.get('email'), fd.get('password'));
        if (res.user.role !== 'admin') { document.querySelector('[data-alert]').innerHTML = '<div class="alert alert--error">This account is not an administrator.</div>'; return; }
        user = res.user; renderShell(); window.addEventListener('hashchange', route); if (!location.hash) location.hash = '#dashboard'; route();
      } catch (err) { document.querySelector('[data-alert]').innerHTML = `<div class="alert alert--error">${esc(err.message)}</div>`; }
    });
  }

  /* ---------------------------------------------------- Shell --------- */
  const NAV = [
    ['dashboard', 'Dashboard', '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z"/>'],
    ['orders', 'Orders', '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>'],
    ['products', 'Products', '<path d="M20 7 12 3 4 7v10l8 4 8-4zM4 7l8 4 8-4M12 11v10"/>'],
    ['inventory', 'Inventory', '<path d="M3 4h18v4H3zM5 8v12h14V8M9 12h6"/>'],
    ['categories', 'Categories', '<path d="M3 3h8v8H3zM13 3h8v8h-8zM13 13h8v8h-8zM3 13h8v8H3z"/>'],
    ['customers', 'Customers', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'],
    ['coupons', 'Discounts', '<path d="M9 9h.01M15 15h.01M20 12a2 2 0 0 1 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1-2-2zM15 9l-6 6"/>'],
    ['reviews', 'Reviews', '<path d="M12 2 15 9l7 .5-5.5 4.5L18 21l-6-4-6 4 1.5-7L2 9.5 9 9z"/>'],
    ['messages', 'Messages', '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
    ['settings', 'Settings', '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 14H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.4 7.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4a2 2 0 1 1 4 0v.09c.66.26 1.4.11 1.9-.4l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'],
  ];
  function renderShell() {
    root.innerHTML = `
      <div class="admin">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar__brand">Loomi<b>paw</b><small>Admin</small></div>
          <nav class="sidebar__nav">
            ${NAV.map(([id, label, icon]) => `<a href="#${id}" data-nav="${id}"><svg viewBox="0 0 24 24">${icon}</svg><span>${label}</span><span class="count" data-count="${id}" hidden></span></a>`).join('')}
          </nav>
          <div class="sidebar__foot"><a href="/" target="_blank">View store ↗</a> · <a href="#" data-logout>Log out</a></div>
        </aside>
        <div class="main">
          <div class="topbar">
            <div style="display:flex;align-items:center;gap:1rem">
              <button class="btn btn--ghost btn--sm menu-toggle" data-menu>☰</button>
              <h1 data-title>Dashboard</h1>
            </div>
            <div class="topbar__actions"><span class="cell-muted">${esc(user.name || user.email)}</span></div>
          </div>
          <div class="content" data-view><div class="empty">Loading…</div></div>
        </div>
      </div>`;
    document.querySelector('[data-logout]').addEventListener('click', async (e) => { e.preventDefault(); await API.logout(); location.reload(); });
    document.querySelector('[data-menu]').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('is-open'));
    refreshCounts();
  }

  async function refreshCounts() {
    try {
      const s = await API.get(admin('/stats'));
      counts = s.stats;
      setCount('orders', counts.pending);
      setCount('reviews', counts.pendingReviews);
      setCount('messages', counts.newMessages);
      setCount('inventory', counts.lowStock);
    } catch (_) {}
  }
  function setCount(id, n) { const el = document.querySelector(`[data-count="${id}"]`); if (el) { el.textContent = n; el.hidden = !n; } }


  // data-href delegation (CSP-safe row navigation)
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, select, textarea')) return;
    const row = e.target.closest('[data-href]');
    if (row) location.hash = row.getAttribute('data-href');
  });

  /* ---------------------------------------------------- Router -------- */
  const view = () => document.querySelector('[data-view]');
  const setTitle = (t) => { const el = document.querySelector('[data-title]'); if (el) el.textContent = t; };
  function setActive(id) { document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.getAttribute('data-nav') === id)); }

  async function route() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    const [name, param] = hash.split('/');
    document.getElementById('sidebar')?.classList.remove('is-open');
    setActive(name);
    const routes = { dashboard: vDashboard, orders: vOrders, order: vOrderDetail, products: vProducts, inventory: vInventory, categories: vCategories, customers: vCustomers, customer: vCustomerDetail, coupons: vCoupons, reviews: vReviews, messages: vMessages, settings: vSettings };
    const fn = routes[name] || vDashboard;
    setTitle((NAV.find((n) => n[0] === name) || [, name[0].toUpperCase() + name.slice(1)])[1]);
    view().innerHTML = '<div class="empty">Loading…</div>';
    try { await fn(param); } catch (e) { view().innerHTML = `<div class="alert alert--error">${esc(e.message)}</div>`; }
  }

  /* ---------------------------------------------------- Dashboard ----- */
  async function vDashboard() {
    const { stats, series, topProducts, recentOrders } = await API.get(admin('/stats'));
    const max = Math.max(1, ...series.map((s) => s.c));
    view().innerHTML = `
      <div class="cards">
        <div class="stat"><div class="stat__label">Revenue</div><div class="stat__value">${money(stats.revenueCents)}</div><div class="stat__sub">${stats.orders} paid orders</div></div>
        <div class="stat"><div class="stat__label">Avg. order</div><div class="stat__value">${money(stats.aovCents)}</div><div class="stat__sub">across all orders</div></div>
        <div class="stat"><div class="stat__label">Awaiting fulfilment</div><div class="stat__value">${stats.pending}</div><div class="stat__sub">to process</div></div>
        <div class="stat"><div class="stat__label">Customers</div><div class="stat__value">${stats.customers}</div><div class="stat__sub">${stats.lowStock} low-stock variants</div></div>
      </div>
      <div class="grid-2">
        <div class="panel"><div class="panel__head"><h2>Revenue — last 14 days</h2></div><div class="panel__body">
          ${series.length ? `<div class="chart">${series.map((s) => `<div class="chart__bar" style="height:${Math.round(s.c / max * 100)}%" title="${fmtDate(s.d)}: ${money(s.c)}"><span>${s.d.slice(5)}</span></div>`).join('')}</div><div style="height:1.5rem"></div>` : '<div class="empty">No sales in this window yet.</div>'}
        </div></div>
        <div class="panel"><div class="panel__head"><h2>Top products</h2></div><div class="panel__body" style="padding:0">
          <table class="data"><tbody>${topProducts.length ? topProducts.map((t) => `<tr><td class="cell-strong">${esc(t.title)}</td><td class="cell-muted">${t.qty} sold</td><td style="text-align:right">${money(t.revenue)}</td></tr>`).join('') : '<tr><td class="empty">No data yet.</td></tr>'}</tbody></table>
        </div></div>
      </div>
      <div class="panel"><div class="panel__head"><h2>Recent orders</h2><a class="btn btn--ghost btn--sm" href="#orders">View all</a></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Date</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${recentOrders.map((o) => `<tr style="cursor:pointer" data-href="#order/${o.number}"><td class="cell-strong">${o.number}</td><td>${esc(o.email)}</td><td><span class="badge status-${o.status}">${o.status}</span></td><td class="cell-muted">${fmtDate(o.created_at)}</td><td style="text-align:right">${money(o.total_cents, o.currency)}</td></tr>`).join('')}</tbody></table></div>
      </div>`;
  }

  /* ---------------------------------------------------- Orders -------- */
  async function vOrders() {
    const status = sessionStorage.getItem('adminOrderFilter') || 'all';
    const { orders } = await API.get(admin('/orders' + (status !== 'all' ? '?status=' + status : '')));
    const statuses = ['all', 'pending', 'paid', 'processing', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'];
    view().innerHTML = `
      <div class="panel">
        <div class="panel__head"><h2>Orders</h2>
          <select class="form-field" data-order-filter style="width:auto;padding:.5rem .8rem;border:1px solid var(--line);border-radius:8px">${statuses.map((s) => `<option value="${s}" ${s === status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th>Payment</th><th>Date</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${orders.length ? orders.map((o) => `<tr style="cursor:pointer" data-href="#order/${o.number}">
          <td class="cell-strong">${o.number}</td><td>${esc(o.email)}</td><td class="cell-muted">${o.items.length}</td>
          <td><span class="badge status-${o.status}">${o.status}</span></td><td><span class="badge status-${o.financial_status}">${o.financial_status}</span></td>
          <td class="cell-muted">${fmtDate(o.created_at)}</td><td style="text-align:right">${money(o.total_cents, o.currency)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">No orders.</td></tr>'}</tbody></table></div>
      </div>`;
    document.querySelector('[data-order-filter]').addEventListener('change', (e) => { sessionStorage.setItem('adminOrderFilter', e.target.value); route(); });
  }

  async function vOrderDetail(number) {
    const { order, payments } = await API.get(admin('/orders/' + encodeURIComponent(number)));
    const s = order.shipping || {};
    const flow = ['pending', 'paid', 'processing', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'];
    setTitle('Order ' + order.number);
    view().innerHTML = `
      <a href="#orders" class="cell-muted" style="display:inline-block;margin-bottom:1rem">← Back to orders</a>
      <div class="grid-2">
        <div>
          <div class="panel"><div class="panel__head"><h2>Items</h2><span class="badge status-${order.status}">${order.status}</span></div>
            <div class="panel__body" style="padding:0"><table class="data"><tbody>
            ${order.items.map((i) => `<tr><td><img class="thumb" src="${i.image || ''}" alt=""></td><td><div class="cell-strong">${esc(i.title)}</div><div class="cell-muted">${esc(i.variant_label || '')} · ${esc(i.sku)}</div></td><td class="cell-muted">×${i.qty}</td><td style="text-align:right">${money(i.unit_price_cents * i.qty, order.currency)}</td></tr>`).join('')}
            </tbody></table></div>
            <div class="panel__body" style="border-top:1px solid var(--line)">
              <div style="display:flex;justify-content:space-between;padding:.2rem 0"><span class="cell-muted">Subtotal</span><span>${money(order.subtotal_cents, order.currency)}</span></div>
              ${order.discount_cents ? `<div style="display:flex;justify-content:space-between;padding:.2rem 0"><span class="cell-muted">Discount ${order.coupon_code ? '(' + esc(order.coupon_code) + ')' : ''}</span><span>−${money(order.discount_cents, order.currency)}</span></div>` : ''}
              <div style="display:flex;justify-content:space-between;padding:.2rem 0"><span class="cell-muted">Shipping</span><span>${money(order.shipping_cents, order.currency)}</span></div>
              <div style="display:flex;justify-content:space-between;padding:.2rem 0"><span class="cell-muted">Tax</span><span>${money(order.tax_cents, order.currency)}</span></div>
              <div style="display:flex;justify-content:space-between;padding:.4rem 0;font-weight:700;font-size:1.05rem;border-top:1px solid var(--line);margin-top:.3rem"><span>Total</span><span>${money(order.total_cents, order.currency)}</span></div>
            </div>
          </div>
          <div class="panel"><div class="panel__head"><h2>Payments</h2></div><div class="panel__body" style="padding:0"><table class="data"><tbody>
            ${(payments || []).map((pm) => `<tr><td class="cell-strong">${esc(pm.provider)}</td><td class="cell-muted">${esc(pm.provider_ref)}</td><td><span class="badge status-${pm.status === 'succeeded' ? 'paid' : pm.status}">${pm.status}</span></td><td style="text-align:right">${money(pm.amount_cents, pm.currency)}</td></tr>`).join('') || '<tr><td class="empty">No payment records.</td></tr>'}
          </tbody></table></div></div>
        </div>
        <div>
          <div class="panel"><div class="panel__head"><h2>Fulfilment</h2></div><div class="panel__body">
            <div class="form-field"><label>Status</label><select data-status>${flow.map((f) => `<option value="${f}" ${f === order.status ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
            <div class="form-field"><label>Tracking number</label><input data-tracking value="${esc(order.tracking_number || '')}" placeholder="Carrier tracking #"></div>
            <div class="form-field"><label>Internal notes</label><textarea data-notes>${esc(order.notes || '')}</textarea></div>
            <button class="btn" data-save-order>Save &amp; notify customer</button>
          </div></div>
          <div class="panel"><div class="panel__head"><h2>Customer</h2></div><div class="panel__body">
            <p class="cell-strong">${esc(s.name || '')}</p><p class="cell-muted">${esc(order.email)}</p>
            <p style="margin-top:.6rem;line-height:1.6">${esc([s.address1, s.address2, s.city, s.region, s.postal, s.country].filter(Boolean).join(', '))}</p>
            ${s.phone ? `<p class="cell-muted" style="margin-top:.4rem">${esc(s.phone)}</p>` : ''}
          </div></div>
        </div>
      </div>`;
    document.querySelector('[data-save-order]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await API.patch(admin('/orders/' + encodeURIComponent(order.number)), {
          status: document.querySelector('[data-status]').value,
          tracking: document.querySelector('[data-tracking]').value,
          notes: document.querySelector('[data-notes]').value,
        });
        toast('Order updated'); refreshCounts(); route();
      } catch (err) { toast(err.message, 'error'); e.target.disabled = false; }
    });
  }

  /* ---------------------------------------------------- Products ------ */
  let categoriesCache = [];
  async function loadCategories() { if (!categoriesCache.length) categoriesCache = (await API.get(admin('/categories'))).categories; return categoriesCache; }

  async function vProducts() {
    const { products } = await API.get(admin('/products'));
    view().innerHTML = `
      <div class="panel">
        <div class="panel__head"><h2>Products (${products.length})</h2><button class="btn" data-new-product>+ New product</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
        <tbody>${products.map((p) => `<tr>
          <td><img class="thumb" src="${p.image || ''}" alt=""></td>
          <td><div class="cell-strong">${esc(p.title)}</div><div class="cell-muted">${p.variants.length} variants</div></td>
          <td class="cell-muted">${esc(p.categoryName || '—')}</td>
          <td>${money(p.priceCents)}${p.compareAtCents ? ` <s class="cell-muted">${money(p.compareAtCents)}</s>` : ''}</td>
          <td>${p.totalStock <= 0 ? '<span class="badge badge--bad">Out</span>' : (p.totalStock <= 10 ? `<span class="badge badge--warn">${p.totalStock}</span>` : p.totalStock)}</td>
          <td><span class="badge ${p.status === 'active' ? 'badge--good' : 'badge--muted'}">${p.status}</span></td>
          <td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-edit="${p.id}">Edit</button><button class="btn btn--danger btn--sm" data-del="${p.id}">Delete</button></div></td>
        </tr>`).join('')}</tbody></table></div>
      </div>`;
    document.querySelector('[data-new-product]').addEventListener('click', () => productModal(null));
    view().querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => productModal(Number(b.getAttribute('data-edit')))));
    view().querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this product? This cannot be undone.')) return;
      try { await API.del(admin('/products/' + b.getAttribute('data-del'))); toast('Product deleted'); route(); } catch (e) { toast(e.message, 'error'); }
    }));
  }

  async function productModal(id) {
    const cats = await loadCategories();
    let p = { title: '', slug: '', categoryId: cats[0] ? cats[0].id : null, subtitle: '', description: '', details: '', priceCents: 0, compareAtCents: null, status: 'active', featured: false, bestSeller: false, tag: '', variants: [], images: [] };
    if (id) p = (await API.get(admin('/products/' + id))).product;
    const priceVal = (c) => (c != null ? (c / 100).toFixed(2) : '');
    openModal(id ? 'Edit product' : 'New product', `
      <div data-alert></div>
      <div class="form-grid">
        <div class="form-row">
          <div class="form-field"><label>Title</label><input name="title" value="${esc(p.title)}" required></div>
          <div class="form-field"><label>Category</label><select name="categoryId">${cats.map((c) => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        </div>
        <div class="form-field"><label>Subtitle</label><input name="subtitle" value="${esc(p.subtitle)}"></div>
        <div class="form-row">
          <div class="form-field"><label>Price (USD)</label><input name="price" type="number" step="0.01" min="0" value="${priceVal(p.priceCents)}" required></div>
          <div class="form-field"><label>Compare-at (optional)</label><input name="compareAt" type="number" step="0.01" min="0" value="${priceVal(p.compareAtCents)}"></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Status</label><select name="status">${['active', 'draft', 'archived'].map((s) => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="form-field"><label>Tag</label><select name="tag">${['', 'New', 'Sale', 'Best Seller'].map((t) => `<option ${t === p.tag ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-field form-field--check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}><label style="margin:0">Featured</label></div>
          <div class="form-field form-field--check"><input type="checkbox" name="bestSeller" ${p.bestSeller ? 'checked' : ''}><label style="margin:0">Best seller</label></div>
        </div>
        <div class="form-field"><label>Description</label><textarea name="description">${esc(p.description)}</textarea></div>
        <div class="form-field"><label>Details &amp; materials</label><textarea name="details">${esc(p.details || '')}</textarea></div>

        <div class="form-field"><label>Variants (colour / size / stock)</label>
          <table class="variants-table"><thead><tr><th>Colour</th><th>Hex</th><th>Size</th><th>Price override</th><th>Stock</th><th></th></tr></thead><tbody data-variants>
          ${(p.variants.length ? p.variants : [{ color: '', colorHex: '#DED0BB', size: '', priceCents: null, stock: 0 }]).map(variantRow).join('')}
          </tbody></table>
          <button type="button" class="btn btn--ghost btn--sm" data-add-variant style="margin-top:.5rem">+ Add variant</button>
        </div>

        ${id ? `<div class="form-field"><label>Images</label>
          <div class="img-drop" data-drop>Click or drop an image to upload (auto-optimized to WebP + responsive sizes)</div>
          <input type="file" accept="image/*" hidden data-file>
          <div class="img-grid" data-images>${p.images.map((im) => imageCell(im)).join('')}</div>
        </div>` : '<p class="hint">Save the product first, then reopen to upload images.</p>'}
      </div>`,
      async (modal) => {
        const alert = modal.querySelector('[data-alert]');
        const get = (n) => modal.querySelector(`[name="${n}"]`);
        const variants = [...modal.querySelectorAll('[data-variant]')].map((row) => ({
          id: row.getAttribute('data-vid') ? Number(row.getAttribute('data-vid')) : undefined,
          color: row.querySelector('[data-c]').value, colorHex: row.querySelector('[data-h]').value,
          size: row.querySelector('[data-s]').value,
          priceCents: row.querySelector('[data-p]').value ? Math.round(parseFloat(row.querySelector('[data-p]').value) * 100) : null,
          stock: parseInt(row.querySelector('[data-st]').value || '0', 10),
        })).filter((v) => v.color || v.size);
        const payload = {
          title: get('title').value, categoryId: Number(get('categoryId').value), subtitle: get('subtitle').value,
          description: get('description').value, details: get('details').value,
          price: parseFloat(get('price').value || '0'), compareAt: get('compareAt').value ? parseFloat(get('compareAt').value) : null,
          status: get('status').value, tag: get('tag').value, featured: get('featured').checked, bestSeller: get('bestSeller').checked,
          variants,
        };
        try {
          if (id) await API.put(admin('/products/' + id), payload);
          else { const r = await API.post(admin('/products'), payload); toast('Product created — reopen to add images'); }
          toast('Product saved'); closeModal(); route();
        } catch (err) { alert.innerHTML = `<div class="alert alert--error">${esc(err.details ? err.details.map((d) => d.path + ': ' + d.message).join(', ') : err.message)}</div>`; return false; }
      });

    // Variant add/remove
    const modal = document.querySelector('.modal');
    modal.querySelector('[data-add-variant]').addEventListener('click', () => {
      modal.querySelector('[data-variants]').insertAdjacentHTML('beforeend', variantRow({ color: '', colorHex: '#DED0BB', size: '', priceCents: null, stock: 0 }));
      wireVariantDelete(modal);
    });
    wireVariantDelete(modal);

    // Image upload
    if (id) {
      const drop = modal.querySelector('[data-drop]'), file = modal.querySelector('[data-file]');
      drop.addEventListener('click', () => file.click());
      ['dragover', 'dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.toggle('drag', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) uploadImage(id, e.dataTransfer.files[0], modal); }));
      file.addEventListener('change', () => { if (file.files[0]) uploadImage(id, file.files[0], modal); });
      wireImageDelete(id, modal);
    }
  }
  function variantRow(v) {
    return `<tr data-variant ${v.id ? `data-vid="${v.id}"` : ''}>
      <td><input data-c value="${esc(v.color)}" placeholder="Oat"></td>
      <td><input data-h type="color" value="${v.colorHex || '#DED0BB'}" style="padding:2px;height:34px"></td>
      <td><input data-s value="${esc(v.size)}" placeholder="M"></td>
      <td><input data-p type="number" step="0.01" value="${v.priceCents != null ? (v.priceCents / 100).toFixed(2) : ''}" placeholder="—"></td>
      <td><input data-st type="number" min="0" value="${v.stock || 0}" style="width:70px"></td>
      <td><button type="button" class="del" data-del-variant>×</button></td></tr>`;
  }
  function wireVariantDelete(modal) { modal.querySelectorAll('[data-del-variant]').forEach((b) => { b.onclick = () => { const rows = modal.querySelectorAll('[data-variant]'); if (rows.length > 1) b.closest('[data-variant]').remove(); }; }); }
  function imageCell(im) { return `<div class="img-cell" data-img="${im.id}"><img src="${im.url}" alt=""><button type="button" data-del-img="${im.id}">×</button></div>`; }
  async function uploadImage(productId, file, modal) {
    const fd = new FormData(); fd.append('image', file);
    try { const r = await API.upload(admin('/products/' + productId + '/images'), fd); modal.querySelector('[data-images]').insertAdjacentHTML('beforeend', imageCell(r.image)); wireImageDelete(productId, modal); toast('Image uploaded'); }
    catch (e) { toast(e.message, 'error'); }
  }
  function wireImageDelete(productId, modal) {
    modal.querySelectorAll('[data-del-img]').forEach((b) => { b.onclick = async () => { try { await API.del(admin('/products/' + productId + '/images/' + b.getAttribute('data-del-img'))); b.closest('[data-img]').remove(); toast('Image removed'); } catch (e) { toast(e.message, 'error'); } }; });
  }

  /* ---------------------------------------------------- Inventory ----- */
  async function vInventory() {
    const { inventory } = await API.get(admin('/inventory'));
    view().innerHTML = `
      <div class="panel"><div class="panel__head"><h2>Inventory (${inventory.length} variants)</h2><span class="cell-muted">Rows in red are at or below their low-stock threshold</span></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th><th></th></tr></thead>
        <tbody>${inventory.map((v) => `<tr>
          <td class="cell-strong">${esc(v.title)}</td><td class="cell-muted">${esc([v.color, v.size].filter(Boolean).join(' · '))}</td><td class="cell-muted">${esc(v.sku)}</td>
          <td style="width:120px"><input type="number" min="0" value="${v.stock}" data-stock="${v.id}" style="width:90px;padding:.4rem .5rem;border:1px solid ${v.stock <= v.low_stock_at ? 'var(--bad)' : 'var(--line)'};border-radius:6px"></td>
          <td><button class="btn btn--ghost btn--sm" data-save-stock="${v.id}">Update</button></td></tr>`).join('')}</tbody></table></div>
      </div>`;
    view().querySelectorAll('[data-save-stock]').forEach((b) => b.addEventListener('click', async () => {
      const id = b.getAttribute('data-save-stock');
      const val = parseInt(view().querySelector(`[data-stock="${id}"]`).value || '0', 10);
      try { await API.patch(admin('/inventory/' + id), { stock: val, reason: 'admin adjustment' }); toast('Stock updated'); refreshCounts(); } catch (e) { toast(e.message, 'error'); }
    }));
  }

  /* ---------------------------------------------------- Categories ---- */
  async function vCategories() {
    categoriesCache = [];
    const cats = await loadCategories();
    view().innerHTML = `
      <div class="panel"><div class="panel__head"><h2>Categories</h2><button class="btn" data-new-cat>+ New category</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Slug</th><th>Description</th><th></th></tr></thead>
        <tbody>${cats.map((c) => `<tr><td class="cell-strong">${esc(c.name)}</td><td class="cell-muted">${esc(c.slug)}</td><td class="cell-muted">${esc(c.description || '')}</td>
          <td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-edit-cat="${c.id}">Edit</button><button class="btn btn--danger btn--sm" data-del-cat="${c.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>
      </div>`;
    document.querySelector('[data-new-cat]').addEventListener('click', () => catModal(null));
    view().querySelectorAll('[data-edit-cat]').forEach((b) => b.addEventListener('click', () => catModal(cats.find((c) => c.id === Number(b.getAttribute('data-edit-cat'))))));
    view().querySelectorAll('[data-del-cat]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete category? Products keep existing but lose this category.')) return; try { await API.del(admin('/categories/' + b.getAttribute('data-del-cat'))); toast('Deleted'); categoriesCache = []; route(); } catch (e) { toast(e.message, 'error'); } }));
  }
  function catModal(c) {
    const isEdit = !!c; c = c || { name: '', description: '', image: '', position: 0 };
    openModal(isEdit ? 'Edit category' : 'New category', `
      <div class="form-grid">
        <div class="form-field"><label>Name</label><input name="name" value="${esc(c.name)}" required></div>
        <div class="form-field"><label>Description</label><textarea name="description">${esc(c.description || '')}</textarea></div>
        <div class="form-field"><label>Image URL</label><input name="image" value="${esc(c.image || '')}"></div>
        <div class="form-field"><label>Position</label><input name="position" type="number" value="${c.position || 0}"></div>
      </div>`, async (modal) => {
      const body = { name: modal.querySelector('[name=name]').value, description: modal.querySelector('[name=description]').value, image: modal.querySelector('[name=image]').value, position: Number(modal.querySelector('[name=position]').value) };
      try { if (isEdit) await API.put(admin('/categories/' + c.id), body); else await API.post(admin('/categories'), body); toast('Saved'); categoriesCache = []; closeModal(); route(); }
      catch (e) { toast(e.message, 'error'); return false; }
    });
  }

  /* ---------------------------------------------------- Customers ----- */
  async function vCustomers() {
    const { customers } = await API.get(admin('/customers'));
    view().innerHTML = `
      <div class="panel"><div class="panel__head"><h2>Customers (${customers.length})</h2></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Spent</th><th>Joined</th></tr></thead>
        <tbody>${customers.length ? customers.map((c) => `<tr style="cursor:pointer" data-href="#customer/${c.id}"><td class="cell-strong">${esc(c.name || '—')}</td><td>${esc(c.email)}</td><td>${c.orders}</td><td>${money(c.spent)}</td><td class="cell-muted">${fmtDate(c.created_at)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No customers yet.</td></tr>'}</tbody></table></div>
      </div>`;
  }
  async function vCustomerDetail(id) {
    const { customer, orders } = await API.get(admin('/customers/' + id));
    let a = {}; try { a = JSON.parse(customer.address_json || '{}'); } catch {}
    setTitle(customer.name || 'Customer');
    view().innerHTML = `
      <a href="#customers" class="cell-muted" style="display:inline-block;margin-bottom:1rem">← Back to customers</a>
      <div class="grid-2">
        <div class="panel"><div class="panel__head"><h2>${esc(customer.name || '—')}</h2></div><div class="panel__body">
          <p>${esc(customer.email)}</p>${customer.phone ? `<p class="cell-muted">${esc(customer.phone)}</p>` : ''}
          <p class="cell-muted" style="margin-top:.6rem">${esc([a.address1, a.city, a.region, a.postal, a.country].filter(Boolean).join(', ')) || 'No address on file'}</p>
          <p class="cell-muted" style="margin-top:.6rem">Joined ${fmtDate(customer.created_at)}</p>
        </div></div>
        <div class="panel"><div class="panel__head"><h2>Orders (${orders.length})</h2></div><div class="panel__body" style="padding:0"><table class="data"><tbody>
          ${orders.length ? orders.map((o) => `<tr style="cursor:pointer" data-href="#order/${o.number}"><td class="cell-strong">${o.number}</td><td><span class="badge status-${o.status}">${o.status}</span></td><td class="cell-muted">${fmtDate(o.created_at)}</td><td style="text-align:right">${money(o.total_cents, o.currency)}</td></tr>`).join('') : '<tr><td class="empty">No orders.</td></tr>'}
        </tbody></table></div></div>
      </div>`;
  }

  /* ---------------------------------------------------- Coupons ------- */
  async function vCoupons() {
    const { coupons } = await API.get(admin('/coupons'));
    view().innerHTML = `
      <div class="panel"><div class="panel__head"><h2>Discount codes</h2><button class="btn" data-new-coupon>+ New code</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min spend</th><th>Used</th><th>Status</th><th></th></tr></thead>
        <tbody>${coupons.length ? coupons.map((c) => `<tr>
          <td class="cell-strong">${esc(c.code)}</td><td class="cell-muted">${c.type}${c.free_shipping ? ' + free ship' : ''}</td>
          <td>${c.type === 'percent' ? c.value + '%' : money(c.value)}</td><td class="cell-muted">${c.min_subtotal_cents ? money(c.min_subtotal_cents) : '—'}</td>
          <td class="cell-muted">${c.used_count}${c.usage_limit ? '/' + c.usage_limit : ''}</td>
          <td><span class="badge ${c.active ? 'badge--good' : 'badge--muted'}">${c.active ? 'Active' : 'Off'}</span></td>
          <td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-edit-coupon="${c.id}">Edit</button><button class="btn btn--danger btn--sm" data-del-coupon="${c.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="7" class="empty">No discount codes yet.</td></tr>'}</tbody></table></div>
      </div>`;
    document.querySelector('[data-new-coupon]').addEventListener('click', () => couponModal(null));
    view().querySelectorAll('[data-edit-coupon]').forEach((b) => b.addEventListener('click', () => couponModal(coupons.find((c) => c.id === Number(b.getAttribute('data-edit-coupon'))))));
    view().querySelectorAll('[data-del-coupon]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete this code?')) return; try { await API.del(admin('/coupons/' + b.getAttribute('data-del-coupon'))); toast('Deleted'); route(); } catch (e) { toast(e.message, 'error'); } }));
  }
  function couponModal(c) {
    const isEdit = !!c; c = c || { code: '', type: 'percent', value: 10, min_subtotal_cents: 0, free_shipping: 0, active: 1, usage_limit: 0 };
    openModal(isEdit ? 'Edit code' : 'New discount code', `
      <div class="form-grid">
        <div class="form-row">
          <div class="form-field"><label>Code</label><input name="code" value="${esc(c.code)}" style="text-transform:uppercase" required></div>
          <div class="form-field"><label>Type</label><select name="type"><option value="percent" ${c.type === 'percent' ? 'selected' : ''}>Percentage</option><option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>Fixed amount</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Value <span class="hint" data-vhint>(% or $)</span></label><input name="value" type="number" step="0.01" min="0" value="${c.type === 'fixed' ? (c.value / 100).toFixed(2) : c.value}"></div>
          <div class="form-field"><label>Minimum spend ($)</label><input name="minSubtotal" type="number" step="0.01" min="0" value="${(c.min_subtotal_cents / 100).toFixed(2)}"></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Usage limit (0 = unlimited)</label><input name="usageLimit" type="number" min="0" value="${c.usage_limit || 0}"></div>
          <div class="form-field" style="display:flex;gap:1.5rem;align-items:flex-end">
            <label class="form-field--check"><input type="checkbox" name="freeShipping" ${c.free_shipping ? 'checked' : ''}> Free shipping</label>
            <label class="form-field--check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> Active</label>
          </div>
        </div>
      </div>`, async (modal) => {
      const g = (n) => modal.querySelector(`[name="${n}"]`);
      const body = { code: g('code').value, type: g('type').value, value: parseFloat(g('value').value || '0'), minSubtotal: parseFloat(g('minSubtotal').value || '0'), usageLimit: Number(g('usageLimit').value || 0), freeShipping: g('freeShipping').checked, active: g('active').checked };
      try { if (isEdit) await API.put(admin('/coupons/' + c.id), body); else await API.post(admin('/coupons'), body); toast('Saved'); closeModal(); route(); }
      catch (e) { toast(e.message, 'error'); return false; }
    });
  }

  /* ---------------------------------------------------- Reviews ------- */
  async function vReviews() {
    const status = sessionStorage.getItem('adminReviewFilter') || 'pending';
    const { reviews } = await API.get(admin('/reviews?status=' + status));
    view().innerHTML = `
      <div class="panel"><div class="panel__head"><h2>Reviews</h2>
        <select data-review-filter style="padding:.5rem .8rem;border:1px solid var(--line);border-radius:8px">${['pending', 'approved', 'rejected', 'all'].map((s) => `<option value="${s}" ${s === status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>By</th><th>Status</th><th></th></tr></thead>
        <tbody>${reviews.length ? reviews.map((r) => `<tr>
          <td class="cell-strong">${esc(r.product_title)}</td><td style="color:var(--gold)">${'★'.repeat(r.rating)}</td>
          <td style="max-width:280px"><div class="cell-strong">${esc(r.title || '')}</div><div class="cell-muted">${esc(r.body)}</div></td>
          <td class="cell-muted">${esc(r.author_name)}${r.verified ? ' ✓' : ''}</td><td><span class="badge ${r.status === 'approved' ? 'badge--good' : r.status === 'rejected' ? 'badge--bad' : 'badge--warn'}">${r.status}</span></td>
          <td><div class="row-actions">${r.status !== 'approved' ? `<button class="btn btn--ghost btn--sm" data-approve="${r.id}">Approve</button>` : ''}${r.status !== 'rejected' ? `<button class="btn btn--ghost btn--sm" data-reject="${r.id}">Reject</button>` : ''}<button class="btn btn--danger btn--sm" data-del-review="${r.id}">Delete</button></div></td>
        </tr>`).join('') : '<tr><td colspan="6" class="empty">No reviews.</td></tr>'}</tbody></table></div>
      </div>`;
    document.querySelector('[data-review-filter]').addEventListener('change', (e) => { sessionStorage.setItem('adminReviewFilter', e.target.value); route(); });
    const act = async (id, status) => { try { await API.patch(admin('/reviews/' + id), { status }); toast('Updated'); refreshCounts(); route(); } catch (e) { toast(e.message, 'error'); } };
    view().querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', () => act(b.getAttribute('data-approve'), 'approved')));
    view().querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => act(b.getAttribute('data-reject'), 'rejected')));
    view().querySelectorAll('[data-del-review]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete review?')) return; try { await API.del(admin('/reviews/' + b.getAttribute('data-del-review'))); toast('Deleted'); refreshCounts(); route(); } catch (e) { toast(e.message, 'error'); } }));
  }

  /* ---------------------------------------------------- Messages ------ */
  async function vMessages() {
    const { messages } = await API.get(admin('/messages'));
    view().innerHTML = `
      <div class="panel"><div class="panel__head"><h2>Contact messages</h2></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Received</th><th>Status</th><th></th></tr></thead>
        <tbody>${messages.length ? messages.map((m) => `<tr>
          <td><div class="cell-strong">${esc(m.name)}</div><div class="cell-muted">${esc(m.email)}</div></td><td>${esc(m.subject || '—')}</td>
          <td style="max-width:320px" class="cell-muted">${esc(m.message)}</td><td class="cell-muted">${fmtDateTime(m.created_at)}</td>
          <td><span class="badge ${m.status === 'new' ? 'badge--info' : 'badge--muted'}">${m.status}</span></td>
          <td><div class="row-actions">${m.status !== 'read' ? `<button class="btn btn--ghost btn--sm" data-read="${m.id}">Mark read</button>` : ''}<button class="btn btn--ghost btn--sm" data-close="${m.id}">Close</button></div></td>
        </tr>`).join('') : '<tr><td colspan="6" class="empty">No messages.</td></tr>'}</tbody></table></div>
      </div>`;
    const set = async (id, status) => { try { await API.patch(admin('/messages/' + id), { status }); toast('Updated'); refreshCounts(); route(); } catch (e) { toast(e.message, 'error'); } };
    view().querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => set(b.getAttribute('data-read'), 'read')));
    view().querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => set(b.getAttribute('data-close'), 'closed')));
  }

  /* ---------------------------------------------------- Settings ------ */
  async function vSettings() {
    const { settings } = await API.get(admin('/settings'));
    const st = settings.store, sh = settings.shipping, tx = settings.tax, pay = settings.payments;
    view().innerHTML = `
      <div class="grid-2">
        <div class="panel"><div class="panel__head"><h2>Store</h2></div><div class="panel__body">
          <div class="form-grid">
            <div class="form-field"><label>Store name</label><input data-s="store.name" value="${esc(st.name)}"></div>
            <div class="form-field"><label>Contact email</label><input data-s="store.email" value="${esc(st.email)}"></div>
            <div class="form-field"><label>Phone</label><input data-s="store.phone" value="${esc(st.phone || '')}"></div>
            <div class="form-field"><label>Currency</label><input data-s="store.currency" value="${esc(st.currency)}"></div>
            <div class="form-field"><label>Announcement bar</label><input data-s="store.announcement" value="${esc(st.announcement || '')}"></div>
          </div>
          <button class="btn" data-save="store" style="margin-top:1rem">Save store</button>
        </div></div>

        <div class="panel"><div class="panel__head"><h2>Tax</h2></div><div class="panel__body">
          <div class="form-grid">
            <div class="form-field"><label>Tax rate (%)</label><input data-s="tax.ratePercent" type="number" step="0.01" value="${tx.ratePercent}"></div>
            <div class="form-field form-field--check"><input type="checkbox" data-s="tax.includedInPrice" ${tx.includedInPrice ? 'checked' : ''}><label style="margin:0">Prices include tax</label></div>
          </div>
          <button class="btn" data-save="tax" style="margin-top:1rem">Save tax</button>
        </div></div>
      </div>

      <div class="panel"><div class="panel__head"><h2>Shipping</h2></div><div class="panel__body">
        <div class="form-field" style="max-width:260px"><label>Free shipping threshold ($)</label><input data-s="shipping.freeThresholdCents" type="number" step="0.01" value="${(sh.freeThresholdCents / 100).toFixed(2)}"></div>
        <label style="display:block;font-size:.78rem;font-weight:600;margin:1rem 0 .5rem;color:var(--ink-2)">Shipping methods</label>
        <table class="variants-table" data-ship-methods><thead><tr><th>ID</th><th>Label</th><th>Price ($)</th><th></th></tr></thead><tbody>
          ${sh.methods.map((m) => shipRow(m)).join('')}
        </tbody></table>
        <button class="btn btn--ghost btn--sm" data-add-ship style="margin-top:.5rem">+ Add method</button>
        <div><button class="btn" data-save="shipping" style="margin-top:1rem">Save shipping</button></div>
      </div></div>

      <div class="panel"><div class="panel__head"><h2>Payments</h2></div><div class="panel__body">
        <div class="form-field" style="max-width:320px"><label>Active provider</label><select data-s="payments.provider"><option value="dev" ${pay.provider === 'dev' ? 'selected' : ''}>Development (simulated)</option><option value="stripe" ${pay.provider === 'stripe' ? 'selected' : ''}>Stripe</option></select></div>
        <p class="hint">Stripe requires STRIPE_SECRET_KEY in your environment. See <code>server/lib/payments/stripe.js</code>. The checkout flow is unchanged when you switch providers.</p>
        <button class="btn" data-save="payments" style="margin-top:1rem">Save payments</button>
      </div></div>`;

    document.querySelector('[data-add-ship]').addEventListener('click', () => { document.querySelector('[data-ship-methods] tbody').insertAdjacentHTML('beforeend', shipRow({ id: '', label: '', priceCents: 0 })); wireShipDelete(); });
    wireShipDelete();

    view().querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', async () => {
      const key = b.getAttribute('data-save');
      const body = {};
      if (key === 'store') body.store = collect('store');
      if (key === 'tax') body.tax = { ratePercent: parseFloat(val('tax.ratePercent')), includedInPrice: document.querySelector('[data-s="tax.includedInPrice"]').checked };
      if (key === 'payments') body.payments = { provider: val('payments.provider') };
      if (key === 'shipping') body.shipping = {
        freeThresholdCents: Math.round(parseFloat(val('shipping.freeThresholdCents') || '0') * 100),
        methods: [...document.querySelectorAll('[data-ship]')].map((r) => ({ id: r.querySelector('[data-mid]').value || r.querySelector('[data-ml]').value.toLowerCase().replace(/\s+/g, '-'), label: r.querySelector('[data-ml]').value, priceCents: Math.round(parseFloat(r.querySelector('[data-mp]').value || '0') * 100) })).filter((m) => m.label),
      };
      try { await API.put(admin('/settings'), body); toast('Settings saved'); } catch (e) { toast(e.message, 'error'); }
    }));
    function val(k) { const el = document.querySelector(`[data-s="${k}"]`); return el ? el.value : ''; }
    function collect(prefix) { const o = {}; document.querySelectorAll(`[data-s^="${prefix}."]`).forEach((el) => { const k = el.getAttribute('data-s').split('.')[1]; o[k] = el.type === 'checkbox' ? el.checked : el.value; }); return o; }
  }
  function shipRow(m) { return `<tr data-ship><td><input data-mid value="${esc(m.id)}" placeholder="standard" style="width:100px"></td><td><input data-ml value="${esc(m.label)}"></td><td><input data-mp type="number" step="0.01" value="${(m.priceCents / 100).toFixed(2)}" style="width:90px"></td><td><button type="button" class="del" data-del-ship>×</button></td></tr>`; }
  function wireShipDelete() { document.querySelectorAll('[data-del-ship]').forEach((b) => { b.onclick = () => b.closest('[data-ship]').remove(); }); }

  /* ---------------------------------------------------- Modal --------- */
  function openModal(title, bodyHtml, onSave) {
    let overlay = document.querySelector('.modal-overlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.className = 'modal-overlay'; document.body.appendChild(overlay); }
    overlay.innerHTML = `<div class="modal"><div class="modal__head"><h2>${esc(title)}</h2><button class="btn btn--ghost btn--sm" data-close-modal>✕</button></div><div class="modal__body"><form data-modal-form>${bodyHtml}</form></div><div class="modal__foot"><button class="btn btn--ghost" data-close-modal>Cancel</button><button class="btn" data-save-modal>Save</button></div></div>`;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    const modal = overlay.querySelector('.modal');
    overlay.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
    const save = async () => { const btn = overlay.querySelector('[data-save-modal]'); btn.disabled = true; const res = await onSave(modal); btn.disabled = false; };
    overlay.querySelector('[data-save-modal]').addEventListener('click', save);
    modal.querySelector('[data-modal-form]').addEventListener('submit', (e) => { e.preventDefault(); save(); });
  }
  function closeModal() { const o = document.querySelector('.modal-overlay'); if (o) { o.classList.remove('is-open'); setTimeout(() => o.remove(), 200); } }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
})();
