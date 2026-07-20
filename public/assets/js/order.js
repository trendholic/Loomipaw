/* Order detail (confirmation + view) and order tracking. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const money = (c, cur) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD' }).format((c || 0) / 100);

  const detail = document.querySelector('[data-order-detail]');
  const trackForm = document.querySelector('[data-track-form]');

  document.addEventListener('loom:ready', () => {
    if (detail) initDetail();
    if (trackForm) initTrack();
  });

  async function initDetail() {
    const params = new URLSearchParams(location.search);
    const number = params.get('number');
    const placed = params.get('placed');
    const email = params.get('email');
    if (!number) { detail.innerHTML = notFound('No order specified.'); return; }
    try {
      const { order } = await API.order(number, email);
      detail.innerHTML = orderHtml(order, placed);
    } catch (e) {
      detail.innerHTML = e.status === 403
        ? `<div class="auth-card"><h1>Verify it’s you</h1><p class="sub">Enter the email used for order ${Loom.escapeHtml(number)}.</p><form data-verify><div class="field"><input name="email" type="email" placeholder="you@example.com" required></div><button class="btn btn--block">View order</button></form></div>`
        : notFound(e.message);
      const vf = detail.querySelector('[data-verify]');
      if (vf) vf.addEventListener('submit', (ev) => { ev.preventDefault(); const em = new FormData(vf).get('email'); location.href = `/account/order.html?number=${encodeURIComponent(number)}&email=${encodeURIComponent(em)}`; });
    }
  }

  function orderHtml(o, placed) {
    const s = o.shipping || {};
    return `
      <div class="confirm">
        ${placed ? `<div class="confirm__badge"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m20 6-11 11-5-5"/></svg></div><p class="eyebrow is-centered">Order confirmed</p><h1 style="margin:.6rem 0">Thank you${s.name ? ', ' + Loom.escapeHtml(s.name.split(' ')[0]) : ''}!</h1><p style="color:var(--ink-2)">A confirmation has been sent to ${Loom.escapeHtml(o.email)}.</p>` : `<h1 style="margin-bottom:.4rem">Order ${Loom.escapeHtml(o.number)}</h1>`}
      </div>
      <div class="order-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <div><strong>${Loom.escapeHtml(o.number)}</strong><br><span style="font-size:.8rem;color:var(--taupe)">${new Date(o.created_at + 'Z').toLocaleString()}</span></div>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
        ${(o.items || []).map((i) => `<div class="order-box__line"><div class="order-box__thumb"><img src="${i.image || ''}" alt=""></div><div style="flex:1"><div style="font-weight:600">${Loom.escapeHtml(i.title)}</div><div style="font-size:.82rem;color:var(--taupe)">${Loom.escapeHtml(i.variant_label || '')} · Qty ${i.qty}</div></div><div style="font-weight:600">${money(i.unit_price_cents * i.qty, o.currency)}</div></div>`).join('')}
        <div style="margin-top:1rem">
          <div class="summary__row"><span class="muted">Subtotal</span><span>${money(o.subtotal_cents, o.currency)}</span></div>
          ${o.discount_cents ? `<div class="summary__row"><span class="muted">Discount</span><span>−${money(o.discount_cents, o.currency)}</span></div>` : ''}
          <div class="summary__row"><span class="muted">Shipping</span><span>${o.shipping_cents ? money(o.shipping_cents, o.currency) : 'Free'}</span></div>
          <div class="summary__row"><span class="muted">Tax</span><span>${money(o.tax_cents, o.currency)}</span></div>
          <div class="summary__row summary__row--total"><span>Total</span><span>${money(o.total_cents, o.currency)}</span></div>
        </div>
        ${o.tracking_number ? `<p style="margin-top:1rem;font-size:.9rem">Tracking: <strong>${Loom.escapeHtml(o.tracking_number)}</strong></p>` : ''}
        <div style="margin-top:1.2rem;font-size:.86rem;color:var(--ink-2)"><strong>Ship to:</strong> ${Loom.escapeHtml([s.name, s.address1, s.city, s.region, s.postal, s.country].filter(Boolean).join(', '))}</div>
      </div>
      <div style="text-align:center;margin-top:2rem"><a class="btn btn--ghost" href="/collection.html">Continue shopping</a></div>`;
  }

  function initTrack() {
    const result = document.querySelector('[data-track-result]');
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(trackForm);
      try { const { order } = await API.order(fd.get('number').trim(), fd.get('email').trim()); result.innerHTML = orderHtml(order, false); }
      catch (err) { result.innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(err.message === 'Order not found' ? 'We couldn’t find that order. Check the number and email.' : err.message)}</div>`; }
    });
  }

  function notFound(msg) { return `<div style="text-align:center;padding:4rem 0"><h1>Order not found</h1><p style="color:var(--ink-2);margin:1rem 0 2rem">${Loom.escapeHtml(msg || '')}</p><a class="btn" href="/">Home</a></div>`; }
})();
