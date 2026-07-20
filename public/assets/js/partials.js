/* Shared header / footer / cart-drawer markup injected into placeholders.
   Runs as a deferred script before main.js boots. */
(function () {
  'use strict';
  const ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><path d="M12 20s-7-4.5-9.5-9C.5 7 3 3.5 6.5 3.5 9 3.5 12 6 12 6s3-2.5 5.5-2.5C21 3.5 23.5 7 21.5 11 19 15.5 12 20 12 20z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
    paw: '<svg class="brand__mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><ellipse cx="11" cy="12" rx="2.1" ry="2.7"/><ellipse cx="21" cy="12" rx="2.1" ry="2.7"/><ellipse cx="7" cy="17" rx="1.9" ry="2.4"/><ellipse cx="25" cy="17" rx="1.9" ry="2.4"/><path d="M16 16c3.4 0 6 2.7 6 5.4 0 2-1.7 3.1-3.6 3.1-1 0-1.7-.4-2.4-.4s-1.4.4-2.4.4c-1.9 0-3.6-1.1-3.6-3.1 0-2.7 2.6-5.4 6-5.4z"/></svg>',
  };
  const brand = (cls = 'brand') => `<a href="/" class="${cls}" aria-label="Loomipaw home">${ICON.paw}<span>Loomi<b>paw</b></span></a>`;

  const header = `
  <div class="announce">Complimentary carbon-neutral shipping over $75 &nbsp;·&nbsp; <a href="/collection.html">Explore the Autumn Edit →</a></div>
  <header class="header" id="header">
    <div class="container">
      <nav class="nav" aria-label="Primary">
        <button class="icon-btn nav__toggle" aria-label="Open menu" data-menu-open>${ICON.menu}</button>
        <div class="nav__group">${brand()}</div>
        <ul class="nav__links">
          <li><a class="nav__link" href="/collection.html">Shop</a></li>
          <li><a class="nav__link" href="/collection.html?category=apparel">Apparel</a></li>
          <li><a class="nav__link" href="/collection.html?category=walking">Walking</a></li>
          <li><a class="nav__link" href="/collection.html?category=beds">Beds &amp; Comfort</a></li>
          <li><a class="nav__link" href="/contact.html">Contact</a></li>
        </ul>
        <div class="nav__actions">
          <button class="icon-btn icon-btn--search" data-search-open aria-label="Search">${ICON.search}</button>
          <a class="icon-btn" data-account-link href="/account/login.html" aria-label="Account">${ICON.user}</a>
          <a class="icon-btn" href="/account/#wishlist" aria-label="Wishlist">${ICON.heart}<span class="icon-btn__badge" data-wishlist-badge hidden>0</span></a>
          <button class="icon-btn" aria-label="Open cart" data-cart-open>${ICON.bag}<span class="icon-btn__badge" data-cart-badge hidden>0</span></button>
        </div>
      </nav>
    </div>
  </header>
  <div class="mobile-nav" id="mobileNav" aria-hidden="true">
    <div class="mobile-nav__top">${brand()}<button class="icon-btn" aria-label="Close menu" data-menu-close>${ICON.close}</button></div>
    <nav class="mobile-nav__links" aria-label="Mobile">
      <a href="/collection.html" data-menu-close>Shop All <span aria-hidden="true">→</span></a>
      <a href="/collection.html?category=apparel" data-menu-close>Apparel <span aria-hidden="true">→</span></a>
      <a href="/collection.html?category=walking" data-menu-close>Walking Essentials <span aria-hidden="true">→</span></a>
      <a href="/collection.html?category=beds" data-menu-close>Beds &amp; Comfort <span aria-hidden="true">→</span></a>
      <a href="/account/" data-menu-close>Account <span aria-hidden="true">→</span></a>
      <a href="/contact.html" data-menu-close>Contact <span aria-hidden="true">→</span></a>
    </nav>
    <div class="mobile-nav__footer"><a class="btn btn--block" href="/collection.html">Shop the Collection</a></div>
  </div>`;

  const footer = `
  <footer class="footer">
    <div class="container">
      <div class="footer__top">
        <div class="footer__brand">
          ${brand()}
          <p>Premium essentials made for the bond between you and your best friend.</p>
          <div class="footer__socials">
            <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
            <a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor"><path d="M15 4c.5 2.5 2 4 4.5 4.3v3C17.5 11.2 16 10.5 15 9.7V15a5 5 0 1 1-5-5c.3 0 .7 0 1 .1v3.1A2 2 0 1 0 12 15V4h3z"/></svg></a>
          </div>
        </div>
        <div class="footer__col"><h4>Shop</h4><a href="/collection.html?category=apparel">Dog Apparel</a><a href="/collection.html?category=walking">Walking Essentials</a><a href="/collection.html?category=accessories">Luxury Accessories</a><a href="/collection.html?category=beds">Beds &amp; Comfort</a></div>
        <div class="footer__col"><h4>Account</h4><a href="/account/">My Account</a><a href="/account/#orders">Orders</a><a href="/account/#wishlist">Wishlist</a><a href="/search.html">Search</a></div>
        <div class="footer__col"><h4>Support</h4><a href="/contact.html">Contact</a><a href="/contact.html">Shipping &amp; Returns</a><a href="/account/track.html">Track Order</a><a href="/contact.html">FAQ</a></div>
      </div>
      <div class="footer__bottom"><span>© 2026 Loomipaw. Crafted with love for good dogs everywhere.</span><div class="footer__pay"><span>VISA</span><span>MC</span><span>AMEX</span><span>PAY</span></div></div>
    </div>
  </footer>`;

  const cart = `
  <div class="overlay" data-overlay></div>
  <aside class="cart" id="cart" aria-label="Shopping cart" aria-hidden="true">
    <div class="cart__head"><h3>Your Cart <span data-cart-title-count></span></h3><button class="icon-btn" aria-label="Close cart" data-cart-close>${ICON.close}</button></div>
    <div class="cart__items" data-cart-items></div>
    <div class="cart__foot" data-cart-foot hidden>
      <div class="cart__ship" data-cart-ship></div>
      <div class="cart__row"><span>Subtotal</span><span class="cart__total" data-cart-subtotal>$0</span></div>
      <a class="btn btn--block" href="/cart.html" style="margin-top:1rem">View Cart &amp; Checkout <span class="btn__arrow" aria-hidden="true">↗</span></a>
      <p class="cart__note">Free carbon-neutral shipping over $75 · 30-day easy returns</p>
    </div>
  </aside>
  <div class="toast" data-toast aria-live="polite"></div>`;

  function inject(sel, html) { const el = document.querySelector(sel); if (el) el.outerHTML = html; }
  inject('[data-partial="header"]', header);
  inject('[data-partial="footer"]', footer);
  inject('[data-partial="cart"]', cart);
})();
