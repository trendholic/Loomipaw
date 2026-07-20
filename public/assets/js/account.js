/* Account dashboard — orders, wishlist, profile, password. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const panel = document.querySelector('[data-account-panel]');
  if (!panel) return;
  const nav = document.querySelector('.account-nav');
  const money = (c) => Loom.money(c);

  document.addEventListener('loom:ready', () => {
    if (!Loom.isAuthed()) { location.href = '/account/login.html?redirect=/account/'; return; }
    const nameWrap = document.querySelector('[data-auth-name]'); if (nameWrap) nameWrap.textContent = Loom.state.user.name || Loom.state.user.email;
    const tab = (location.hash || '#orders').replace('#', '');
    show(tab);
    nav.addEventListener('click', (e) => {
      const a = e.target.closest('[data-tab]'); if (!a) return; e.preventDefault();
      show(a.getAttribute('data-tab'));
    });
  });

  function setActive(tab) { nav.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('is-active', a.getAttribute('data-tab') === tab)); history.replaceState({}, '', '#' + tab); }

  async function show(tab) {
    setActive(tab);
    panel.innerHTML = '<p class="pdp-loading">Loading…</p>';
    try {
      if (tab === 'orders') return renderOrders();
      if (tab === 'wishlist') return renderWishlist();
      if (tab === 'profile') return renderProfile();
      if (tab === 'password') return renderPassword();
    } catch (e) { panel.innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(e.message)}</div>`; }
  }

  async function renderOrders() {
    const { orders } = await API.orders();
    if (!orders.length) { panel.innerHTML = `<h2 style="margin-bottom:1rem">Orders</h2><div class="empty-state">No orders yet. <a href="/collection.html" style="color:var(--clay);text-decoration:underline">Start shopping →</a></div>`; return; }
    panel.innerHTML = `<h2 style="margin-bottom:1rem">Orders</h2>` + orders.map((o) => `
      <div class="order-row">
        <div><a href="/account/order.html?number=${encodeURIComponent(o.number)}">${o.number}</a><br><span style="font-size:.8rem;color:var(--taupe)">${new Date(o.created_at + 'Z').toLocaleDateString()} · ${o.items.length} item(s)</span></div>
        <span class="status-badge status-${o.status}">${o.status}</span>
        <span style="font-weight:600">${money(o.total_cents)}</span>
        <a class="link-underline" href="/account/order.html?number=${encodeURIComponent(o.number)}">View</a>
      </div>`).join('');
  }

  async function renderWishlist() {
    const { items } = await API.wishlist();
    if (!items.length) { panel.innerHTML = `<h2 style="margin-bottom:1rem">Wishlist</h2><div class="empty-state">Nothing saved yet.</div>`; return; }
    panel.innerHTML = `<h2 style="margin-bottom:1.5rem">Wishlist</h2><div class="products-grid">${items.map((p) => Loom.productCard(p)).join('')}</div>`;
    Loom.syncWishButtons();
  }

  function renderProfile() {
    const u = Loom.state.user; const a = u.address || {};
    panel.innerHTML = `
      <h2 style="margin-bottom:1.5rem">Profile</h2>
      <form class="auth-card" data-profile-form style="max-width:560px">
        <div data-profile-alert></div>
        <div class="field"><label>Name</label><input name="name" value="${Loom.escapeAttr(u.name || '')}" required></div>
        <div class="field"><label>Email</label><input value="${Loom.escapeAttr(u.email)}" disabled></div>
        <div class="field"><label>Phone</label><input name="phone" value="${Loom.escapeAttr(u.phone || '')}"></div>
        <h3 style="font-size:1rem;margin:1rem 0 .8rem">Default shipping address</h3>
        <div class="field"><label>Address</label><input name="address1" value="${Loom.escapeAttr(a.address1 || '')}"></div>
        <div class="field--row"><div class="field"><label>City</label><input name="city" value="${Loom.escapeAttr(a.city || '')}"></div><div class="field"><label>Region</label><input name="region" value="${Loom.escapeAttr(a.region || '')}"></div></div>
        <div class="field--row"><div class="field"><label>Postal</label><input name="postal" value="${Loom.escapeAttr(a.postal || '')}"></div><div class="field"><label>Country</label><input name="country" value="${Loom.escapeAttr(a.country || '')}"></div></div>
        <button class="btn" type="submit">Save changes</button>
      </form>`;
    document.querySelector('[data-profile-form]').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      try {
        const res = await API.updateProfile({ name: fd.get('name'), phone: fd.get('phone'), address: { address1: fd.get('address1'), city: fd.get('city'), region: fd.get('region'), postal: fd.get('postal'), country: fd.get('country') } });
        Loom.state.user = res.user; Loom.renderHeader();
        document.querySelector('[data-profile-alert]').innerHTML = '<div class="alert alert--ok">Profile updated.</div>';
      } catch (err) { document.querySelector('[data-profile-alert]').innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(err.message)}</div>`; }
    });
  }

  function renderPassword() {
    panel.innerHTML = `
      <h2 style="margin-bottom:1.5rem">Change password</h2>
      <form class="auth-card" data-password-form style="max-width:460px">
        <div data-password-alert></div>
        <div class="field"><label>Current password</label><input name="current" type="password" required></div>
        <div class="field"><label>New password</label><input name="password" type="password" minlength="8" required></div>
        <button class="btn" type="submit">Update password</button>
      </form>`;
    document.querySelector('[data-password-form]').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      try { await API.changePassword(fd.get('current'), fd.get('password')); e.target.reset(); document.querySelector('[data-password-alert]').innerHTML = '<div class="alert alert--ok">Password changed.</div>'; }
      catch (err) { document.querySelector('[data-password-alert]').innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(err.message)}</div>`; }
    });
  }
})();
