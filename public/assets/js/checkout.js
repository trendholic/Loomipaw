/* Checkout — address, shipping method, payment, order placement. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const root = document.querySelector('[data-checkout]');
  if (!root) return;
  let cart = null, settings = null, user = null, method = null;

  document.addEventListener('loom:ready', init);
  const money = (c) => Loom.money(c);

  async function init() {
    try {
      cart = (await API.cart()).cart;
      settings = Loom.state.settings;
      user = Loom.state.user;
    } catch (e) { root.innerHTML = `<p class="empty-state">${Loom.escapeHtml(e.message)}</p>`; return; }
    if (!cart.items.length) {
      root.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem 0"><p style="font-family:var(--font-display);font-size:1.6rem">Your cart is empty</p><a class="btn" href="/collection.html" style="margin-top:1.5rem">Shop the collection</a></div>`;
      return;
    }
    method = cart.shipping.methodId;
    render();
  }

  function render() {
    const a = (user && user.address) || {};
    root.innerHTML = `
      <div class="checkout">
        <form data-checkout-form>
          <div data-alert></div>
          <div class="checkout__section">
            <h2>Contact</h2>
            <div class="field"><label for="ck-email">Email</label><input id="ck-email" name="email" type="email" required value="${user ? Loom.escapeAttr(user.email) : ''}"></div>
          </div>
          <div class="checkout__section">
            <h2>Shipping address</h2>
            <div class="field"><label for="ck-name">Full name</label><input id="ck-name" name="name" required value="${user ? Loom.escapeAttr(user.name || '') : ''}"></div>
            <div class="field"><label for="ck-a1">Address</label><input id="ck-a1" name="address1" required value="${Loom.escapeAttr(a.address1 || '')}"></div>
            <div class="field"><label for="ck-a2">Apartment, suite (optional)</label><input id="ck-a2" name="address2" value="${Loom.escapeAttr(a.address2 || '')}"></div>
            <div class="field--row"><div class="field"><label for="ck-city">City</label><input id="ck-city" name="city" required value="${Loom.escapeAttr(a.city || '')}"></div><div class="field"><label for="ck-region">State / Region</label><input id="ck-region" name="region" required value="${Loom.escapeAttr(a.region || '')}"></div></div>
            <div class="field--row"><div class="field"><label for="ck-postal">Postal code</label><input id="ck-postal" name="postal" required value="${Loom.escapeAttr(a.postal || '')}"></div><div class="field"><label for="ck-country">Country</label><input id="ck-country" name="country" required value="${Loom.escapeAttr(a.country || 'USA')}"></div></div>
            <div class="field"><label for="ck-phone">Phone (optional)</label><input id="ck-phone" name="phone" value="${Loom.escapeAttr(a.phone || '')}"></div>
          </div>
          <div class="checkout__section">
            <h2>Shipping method</h2>
            ${(cart.shipping.methods || []).map((m) => `<label class="ship-option"><input type="radio" name="ship" value="${m.id}" ${m.id === method ? 'checked' : ''}><span class="label">${Loom.escapeHtml(m.label)}</span><span class="price">${cart.shipping.qualifiesFree ? 'Free' : money(m.priceCents)}</span></label>`).join('')}
          </div>
          <div class="checkout__section">
            <h2>Payment</h2>
            <p style="font-size:.84rem;color:var(--ink-2);margin-bottom:1rem">Provider: <strong>${settings.payments.provider}</strong> · Payments are processed securely.</p>
            <div class="field"><label for="ck-card">Card number</label><input id="ck-card" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" required></div>
            <div class="field--row"><div class="field"><label for="ck-exp">Expiry</label><input id="ck-exp" name="expiry" placeholder="MM/YY" autocomplete="cc-exp"></div><div class="field"><label for="ck-cvc">CVC</label><input id="ck-cvc" name="cvc" placeholder="123" autocomplete="cc-csc"></div></div>
            ${settings.payments.provider === 'dev' ? `<div class="test-cards"><strong>Test mode.</strong> Use <code>4242 4242 4242 4242</code> for success · <code>4000 0000 0000 0002</code> for a declined card. No real charges are made.</div>` : ''}
          </div>
          <button class="btn btn--block" type="submit" data-place>Place order — <span data-place-total>${money(cart.totalCents)}</span></button>
        </form>
        <aside class="summary" data-summary>${summaryHtml()}</aside>
      </div>`;
    wire();
  }

  function summaryHtml() {
    return `<h2>Order summary</h2>
      ${cart.items.map((l) => `<div class="summary__row"><span class="muted">${Loom.escapeHtml(l.title)} <span style="color:var(--taupe)">×${l.qty}</span></span><span>${money(l.lineCents)}</span></div>`).join('')}
      <div class="summary__row" style="border-top:1px solid var(--line);margin-top:.5rem;padding-top:.7rem"><span class="muted">Subtotal</span><span>${money(cart.subtotalCents)}</span></div>
      ${cart.discountCents ? `<div class="summary__row"><span class="muted">Discount${cart.coupon ? ' (' + cart.coupon.code + ')' : ''}</span><span>−${money(cart.discountCents)}</span></div>` : ''}
      <div class="summary__row"><span class="muted">Shipping</span><span>${cart.shippingCents ? money(cart.shippingCents) : 'Free'}</span></div>
      <div class="summary__row"><span class="muted">Tax</span><span>${money(cart.taxCents)}</span></div>
      <div class="summary__row summary__row--total"><span>Total</span><span>${money(cart.totalCents)}</span></div>`;
  }

  function wire() {
    root.querySelectorAll('input[name=ship]').forEach((r) => r.addEventListener('change', async () => {
      method = r.value;
      try { cart = (await API.get('/cart?method=' + encodeURIComponent(method))).cart; document.querySelector('[data-summary]').innerHTML = summaryHtml(); document.querySelector('[data-place-total]').textContent = money(cart.totalCents); } catch (_) {}
    }));
    root.querySelector('[data-checkout-form]').addEventListener('submit', place);
  }

  async function place(e) {
    e.preventDefault();
    const btn = root.querySelector('[data-place]');
    const alert = root.querySelector('[data-alert]');
    const fd = new FormData(e.target);
    const payload = {
      email: fd.get('email'),
      shippingMethodId: method,
      shipping: { name: fd.get('name'), address1: fd.get('address1'), address2: fd.get('address2'), city: fd.get('city'), region: fd.get('region'), postal: fd.get('postal'), country: fd.get('country'), phone: fd.get('phone') },
      payment: { method: 'card', cardNumber: fd.get('cardNumber'), expiry: fd.get('expiry'), cvc: fd.get('cvc') },
    };
    btn.disabled = true; btn.textContent = 'Processing…'; alert.innerHTML = '';
    try {
      const res = await API.checkout(payload);
      Loom.refreshCart();
      location.href = `/account/order.html?number=${encodeURIComponent(res.order.number)}&placed=1`;
    } catch (err) {
      alert.innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(err.message)}</div>`;
      alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.disabled = false; btn.innerHTML = `Place order — <span>${money(cart.totalCents)}</span>`;
    }
  }
})();
