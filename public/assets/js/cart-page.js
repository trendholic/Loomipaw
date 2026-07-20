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
          ${cart.shipping && !cart.shipping.qualifiesFree && cart.shipping.remainingForFreeCents > 0 ? `<p class="cart__note" style="margin:.8rem 0">Add <b>${money(cart.shipping.remainingForFreeCents)}</b> for free shipping.</p>` : ''}
          <a class="btn btn--block" href="/checkout.html" style="margin-top:1rem">Proceed to Checkout <span class="btn__arrow" aria-hidden="true">↗</span></a>
          <p class="cart__note">Secure checkout · 30-day returns</p>
        </aside>
      </div>`;
    wire();
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
