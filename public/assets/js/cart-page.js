/* Full cart page — line editing, coupon, totals. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const root = document.querySelector('[data-cart-page]');
  if (!root) return;
  let cart = null;

  document.addEventListener('loom:ready', load);
  async function load() { try { cart = (await API.cart()).cart; render(); } catch (e) { root.innerHTML = `<p class="empty-state">${Loom.escapeHtml(e.message)}</p>`; } }
  const money = (c) => Loom.money(c);

  function shipProgressHtml() {
    const s = cart.shipping;
    if (!s) return '';
    const thr = (Loom.state.settings && Loom.state.settings.shipping && Loom.state.settings.shipping.freeThresholdCents) || 7500;
    const pct = s.qualifiesFree ? 100 : Math.max(4, Math.min(100, Math.round((cart.subtotalCents / thr) * 100)));
    const msg = s.qualifiesFree
      ? "🎉 You've unlocked <b>free carbon-neutral shipping!</b>"
      : `You're <b>${money(s.remainingForFreeCents)}</b> away from <b>free shipping</b>`;
    return `<div class="ship-progress ${s.qualifiesFree ? 'is-unlocked' : ''}" style="margin-bottom:1rem">
      <div class="ship-progress__msg">${msg}</div>
      <div class="ship-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="ship-progress__fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function render() {
    if (!cart.items.length) {
      root.innerHTML = `<div class="empty-state" style="text-align:center;padding:4rem 0"><p style="font-family:var(--font-display);font-size:1.8rem;margin-bottom:1rem">Your cart is empty</p><p style="color:var(--ink-2);margin-bottom:2rem">Discover pieces made for your best friend.</p><a class="btn" href="/collection.html">Shop the collection</a></div>`;
      return;
    }
    root.innerHTML = `
      <div class="cart-page">
        <div class="cart-lines">
          ${cart.items.map(lineHtml).join('')}
        </div>
        <aside class="summary">
          <h2>Order summary</h2>
          ${shipProgressHtml()}
          <div class="coupon-row">
            <input type="text" placeholder="Discount code" data-coupon-input value="${cart.coupon && !cart.coupon.invalid ? cart.coupon.code : ''}">
            <button class="btn btn--sm" data-coupon-apply>Apply</button>
          </div>
          <div data-coupon-msg></div>
          <div class="summary__row"><span class="muted">Subtotal</span><span>${money(cart.subtotalCents)}</span></div>
          ${cart.discountCents ? `<div class="summary__row"><span class="muted">Discount</span><span>−${money(cart.discountCents)}</span></div>` : ''}
          <div class="summary__row"><span class="muted">Shipping</span><span>${cart.shippingCents ? money(cart.shippingCents) : 'Free'}</span></div>
          <div class="summary__row"><span class="muted">Tax (${cart.tax.ratePercent}%)</span><span>${money(cart.taxCents)}</span></div>
          <div class="summary__row summary__row--total"><span>Total</span><span>${money(cart.totalCents)}</span></div>
          <a class="btn btn--block" href="/checkout.html" style="margin-top:1rem">Proceed to Checkout <span class="btn__arrow" aria-hidden="true">↗</span></a>
          <div class="trust-row trust-row--sm">
            <span><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> Secure SSL checkout</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3z"/><path d="m9 12 2 2 4-4"/></svg> 30-day returns</span>
          </div>
          <div class="cart-upsell" data-cart-upsell hidden></div>
        </aside>
      </div>`;
    wire();
    loadUpsell();
  }

  // "Complete the set": recommend one highly-rated item not already in the
  // cart. Simple, honest AOV nudge — one-tap add, no dark patterns.
  async function loadUpsell() {
    const el = root.querySelector('[data-cart-upsell]');
    if (!el) return;
    const inCart = new Set(cart.items.map((i) => i.productSlug));
    try {
      const { products } = await API.products('sort=reviews&limit=8');
      const pick = (products || []).find((p) => p.inStock && !inCart.has(p.slug) && (p.variants || []).some((v) => v.inStock));
      if (!pick) return;
      const variant = pick.variants.find((v) => v.inStock);
      el.innerHTML = `
        <div class="cart-upsell__head">Complete the set</div>
        <div class="cart-upsell__item">
          <a href="/product.html?slug=${encodeURIComponent(pick.slug)}"><img src="${pick.image || ''}" alt="${Loom.escapeAttr(pick.title)}"></a>
          <div class="cart-upsell__info">
            <div class="cart-upsell__name"><a href="/product.html?slug=${encodeURIComponent(pick.slug)}">${Loom.escapeHtml(pick.title)}</a></div>
            <div class="cart-upsell__price">${money(pick.priceCents)} · ${pick.rating ? pick.rating.toFixed(1) : '—'}★</div>
          </div>
          <button class="btn btn--sm" data-upsell-add="${variant.id}" data-add-label="${Loom.escapeAttr(pick.title)}">Add</button>
        </div>`;
      el.hidden = false;
      el.querySelector('[data-upsell-add]').addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.getAttribute('data-upsell-add'));
        await Loom.addToCart(id, 1, { label: pick.title, open: false });
        await load(); // re-render the page cart + summary with the new line
      });
    } catch (_) { /* non-fatal */ }
  }

  function lineHtml(l) {
    return `<div class="cart-line" data-line="${l.variantId}">
      <div class="cart-line__img"><img src="${l.image || ''}" alt="${Loom.escapeAttr(l.title)}" loading="lazy"></div>
      <div>
        <div class="cart-line__title">${Loom.escapeHtml(l.title)}</div>
        <div class="cart-line__variant">${Loom.escapeHtml(l.variantLabel || '')}</div>
        <div class="cart-item__qty" style="margin-top:.75rem">
          <button aria-label="Decrease" data-dec>−</button><span>${l.qty}</span><button aria-label="Increase" data-inc ${l.qty >= l.maxQty ? 'disabled' : ''}>+</button>
        </div>
        <button class="cart-item__remove" data-remove style="margin-top:.5rem">Remove</button>
      </div>
      <div class="cart-line__price">${money(l.lineCents)}</div>
    </div>`;
  }

  function wire() {
    root.querySelectorAll('[data-line]').forEach((el) => {
      const id = Number(el.getAttribute('data-line'));
      const item = cart.items.find((i) => i.variantId === id);
      el.querySelector('[data-inc]')?.addEventListener('click', () => update(id, item.qty + 1));
      el.querySelector('[data-dec]')?.addEventListener('click', () => update(id, item.qty - 1));
      el.querySelector('[data-remove]')?.addEventListener('click', () => update(id, 0));
    });
    root.querySelector('[data-coupon-apply]')?.addEventListener('click', applyCoupon);
    root.querySelector('[data-coupon-input]')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
  }

  async function update(id, qty) {
    try {
      cart = (qty <= 0 ? await API.removeCartItem(id) : await API.updateCartItem(id, qty)).cart;
      render(); Loom.refreshCart();
    } catch (e) { Loom.toast(e.message, 'error'); load(); }
  }

  async function applyCoupon() {
    const code = root.querySelector('[data-coupon-input]').value.trim();
    const msg = root.querySelector('[data-coupon-msg]');
    if (!code) { cart = (await API.removeCoupon()).cart; render(); return; }
    try { cart = (await API.applyCoupon(code)).cart; Loom.toast('Coupon applied'); render(); }
    catch (e) { msg.innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(e.message)}</div>`; }
  }
})();
