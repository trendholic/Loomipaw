/* =====================================================================
   Loomipaw storefront controller — API-driven.
   Cart · Wishlist · Auth-aware header · Reveal · Nav · Newsletter · Toast
   Exposes window.Loom for page scripts.
   ===================================================================== */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    user: null,
    cart: { items: [], count: 0, subtotalCents: 0 },
    currency: 'USD',
    wishlist: new Set(),
    settings: null,
  };

  const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: state.currency }).format((cents || 0) / 100);

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg, kind = 'ok') {
    let el = $('[data-toast]');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('data-toast', ''); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    const icon = kind === 'error'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m20 6-11 11-5-5"/></svg>';
    el.innerHTML = icon + '<span>' + msg + '</span>';
    el.classList.toggle('is-error', kind === 'error');
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                           */
  /* ------------------------------------------------------------------ */
  async function boot() {
    try {
      const s = await API.settings();
      state.settings = s;
      state.currency = (s.store && s.store.currency) || 'USD';
    } catch (_) {}
    try { const me = await API.me(); state.user = me.user; } catch (_) {}
    if (state.user) {
      try { const wl = await API.wishlist(); state.wishlist = new Set(wl.items.map((p) => p.id)); } catch (_) {}
      await mergeLocalWishlist();
    } else {
      state.wishlist = new Set(localWishlist());
    }
    try { const c = await API.cart(); state.cart = c.cart; } catch (_) {}
    renderHeader();
    renderCart();
    updateBadges();
    syncWishButtons();
    renderCompareTray();
    document.dispatchEvent(new CustomEvent('loom:ready', { detail: state }));
  }

  /* ------------------------------------------------------------------ */
  /* Global error handling — never crash the page; log + gentle notice   */
  /* ------------------------------------------------------------------ */
  let errorNotified = false;
  function handleGlobalError(err) {
    // eslint-disable-next-line no-console
    console.error('[Loom]', err);
    if (!errorNotified) { errorNotified = true; setTimeout(() => { errorNotified = false; }, 8000); toast('Something went wrong. Please try again.', 'error'); }
  }
  window.addEventListener('error', (e) => { if (e.error) handleGlobalError(e.error); });
  window.addEventListener('unhandledrejection', (e) => { handleGlobalError(e.reason); });

  /* ------------------------------------------------------------------ */
  /* Header (auth-aware) + badges                                        */
  /* ------------------------------------------------------------------ */
  function renderHeader() {
    $$('[data-account-link]').forEach((a) => {
      a.setAttribute('href', state.user ? '/account/' : '/account/login.html');
      a.setAttribute('aria-label', state.user ? 'Your account' : 'Log in');
    });
    $$('[data-auth-name]').forEach((el) => { el.textContent = state.user ? (state.user.name || state.user.email) : ''; });
    document.body.classList.toggle('is-authed', !!state.user);
    // Mark the current section in the primary nav for screen readers.
    const path = location.pathname + location.search;
    $$('.nav__link').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href !== '/' && (path === href || (href.length > 1 && path.startsWith(href)));
      if (match) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // Accessible form validation: reflect native validity as aria-invalid.
  function initA11y() {
    document.addEventListener('invalid', (e) => {
      const el = e.target; if (el && el.setAttribute) el.setAttribute('aria-invalid', 'true');
    }, true);
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (el && el.getAttribute && el.getAttribute('aria-invalid') === 'true' && el.checkValidity && el.checkValidity()) el.removeAttribute('aria-invalid');
    });
  }

  function updateBadges() {
    const count = state.cart.count || 0;
    $$('[data-cart-badge]').forEach((b) => { b.textContent = count; b.hidden = count === 0; });
    const wc = state.wishlist.size;
    $$('[data-wishlist-badge]').forEach((b) => { b.textContent = wc; b.hidden = wc === 0; });
  }

  /* ------------------------------------------------------------------ */
  /* Cart drawer (server-backed)                                         */
  /* ------------------------------------------------------------------ */
  const cartEl = () => $('#cart');
  const overlay = () => $('[data-overlay]');

  function openCart() { const c = cartEl(); if (!c) return; c.classList.add('is-open'); c.setAttribute('aria-hidden', 'false'); overlay()?.classList.add('is-open'); document.body.style.overflow = 'hidden'; setTimeout(() => c.querySelector('[data-cart-close]')?.focus(), 60); }
  function closeCart() { const c = cartEl(); if (!c) return; c.classList.remove('is-open'); c.setAttribute('aria-hidden', 'true'); overlay()?.classList.remove('is-open'); document.body.style.overflow = ''; }

  function renderCart() {
    const wrap = $('[data-cart-items]');
    const cart = state.cart;
    const titleCount = $('[data-cart-title-count]');
    if (titleCount) titleCount.textContent = cart.count ? `(${cart.count})` : '';
    if (!wrap) return;
    const foot = $('[data-cart-foot]');
    if (!cart.items || !cart.items.length) {
      wrap.innerHTML = '<div class="cart__empty"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.4"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg><p>Your cart is empty.</p><p style="margin-top:.5rem;font-size:.85rem">Beautiful things await your best friend.</p></div>';
      if (foot) foot.hidden = true;
      return;
    }
    wrap.innerHTML = cart.items.map((l) => `
      <div class="cart-item">
        <div class="cart-item__img"><img src="${l.image || ''}" alt="${escapeAttr(l.title)}" loading="lazy"></div>
        <div>
          <div class="cart-item__title">${escapeHtml(l.title)}</div>
          <div class="cart-item__variant">${escapeHtml(l.variantLabel || '')}</div>
          <div class="cart-item__qty">
            <button aria-label="Decrease" data-cart-dec="${l.variantId}">−</button>
            <span>${l.qty}</span>
            <button aria-label="Increase" data-cart-inc="${l.variantId}" ${l.qty >= l.maxQty ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div class="cart-item__price">${money(l.lineCents)}</div>
          <button class="cart-item__remove" data-cart-remove="${l.variantId}">Remove</button>
        </div>
      </div>`).join('');
    if ($('[data-cart-subtotal]')) $('[data-cart-subtotal]').textContent = money(cart.subtotalCents);
    const ship = $('[data-cart-ship]');
    if (ship && cart.shipping) {
      ship.innerHTML = cart.shipping.qualifiesFree
        ? "🎉 You've unlocked <b>free carbon-neutral shipping!</b>"
        : `Add <b>${money(cart.shipping.remainingForFreeCents)}</b> more for free shipping.`;
    }
    if (foot) foot.hidden = false;
  }

  async function refreshCart() {
    try { const c = await API.cart(); state.cart = c.cart; renderCart(); updateBadges(); } catch (_) {}
  }

  async function addToCart(variantId, qty = 1, opts = {}) {
    if (!variantId) { toast('Please choose an option', 'error'); return; }
    try {
      const c = await API.addToCart(variantId, qty);
      state.cart = c.cart; renderCart(); updateBadges();
      toast(opts.label ? `${opts.label} added to cart` : 'Added to cart');
      if (opts.open !== false) openCart();
    } catch (e) { toast(e.message, 'error'); }
  }
  async function setCartQty(variantId, qty) {
    try { const c = await API.updateCartItem(variantId, qty); state.cart = c.cart; renderCart(); updateBadges(); }
    catch (e) { toast(e.message, 'error'); refreshCart(); }
  }
  async function removeCartItem(variantId) {
    try { const c = await API.removeCartItem(variantId); state.cart = c.cart; renderCart(); updateBadges(); }
    catch (e) { toast(e.message, 'error'); }
  }

  /* ------------------------------------------------------------------ */
  /* Wishlist (server when authed, localStorage for guests)              */
  /* ------------------------------------------------------------------ */
  const localWishlist = () => { try { return JSON.parse(localStorage.getItem('lp_wish') || '[]'); } catch { return []; } };
  const saveLocalWishlist = (arr) => localStorage.setItem('lp_wish', JSON.stringify(arr));
  async function mergeLocalWishlist() {
    const local = localWishlist();
    if (!local.length) return;
    for (const id of local) { try { await API.addWishlist(id); state.wishlist.add(id); } catch (_) {} }
    saveLocalWishlist([]);
  }

  async function toggleWishlist(productId) {
    productId = Number(productId);
    const has = state.wishlist.has(productId);
    if (state.user) {
      try {
        if (has) { await API.removeWishlist(productId); state.wishlist.delete(productId); }
        else { await API.addWishlist(productId); state.wishlist.add(productId); }
      } catch (e) { toast(e.message, 'error'); return; }
    } else {
      const arr = localWishlist();
      if (has) { state.wishlist.delete(productId); saveLocalWishlist(arr.filter((x) => x !== productId)); }
      else { state.wishlist.add(productId); saveLocalWishlist([...new Set([...arr, productId])]); }
    }
    updateBadges(); syncWishButtons();
    toast(has ? 'Removed from wishlist' : 'Saved to wishlist');
  }
  function syncWishButtons() {
    $$('[data-wish]').forEach((b) => {
      const active = state.wishlist.has(Number(b.getAttribute('data-wish')));
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Product card (API shape)                                            */
  /* ------------------------------------------------------------------ */
  function productCard(p) {
    const wish = state.wishlist.has(p.id);
    const priceHtml = p.compareAtCents
      ? `<s>${money(p.compareAtCents)}</s>${money(p.priceCents)}`
      : money(p.priceCents);
    const tagHtml = p.tag ? `<span class="product-card__tag ${p.tag === 'Sale' ? 'product-card__tag--sale' : ''}">${p.tag}</span>` : '';
    const swatches = (p.colors || []).map((c, i) => `<button class="swatch" style="background:${c.hex}" aria-label="${escapeAttr(c.name)}" title="${escapeAttr(c.name)}" aria-pressed="${i === 0}"></button>`).join('');
    const firstVariant = (p.variants || []).find((v) => v.inStock) || (p.variants || [])[0];
    const alt = p.imageAlt || p.image;
    const sold = !p.inStock;
    return `
      <article class="product-card" data-card="${p.id}">
        <div class="product-card__media">
          ${sold ? '<span class="product-card__tag" style="background:#8A5E3C;color:#fff">Sold out</span>' : tagHtml}
          <button class="wishlist-btn ${wish ? 'is-active' : ''}" data-wish="${p.id}" aria-label="Save to wishlist" aria-pressed="${wish}">
            <svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M12 20s-7-4.5-9.5-9C.5 7 3 3.5 6.5 3.5 9 3.5 12 6 12 6s3-2.5 5.5-2.5C21 3.5 23.5 7 21.5 11 19 15.5 12 20 12 20z"/></svg>
          </button>
          <button class="compare-btn" data-compare="${p.slug}" aria-label="Add ${escapeAttr(p.title)} to compare" title="Compare">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M3 6h13M3 12h13M3 18h13M18 8l3 3-3 3"/></svg>
          </button>
          <a href="/product.html?slug=${encodeURIComponent(p.slug)}" aria-label="${escapeAttr(p.title)}" tabindex="-1">
            <img class="is-main" src="${p.image || ''}" alt="${escapeAttr(p.title)}" loading="lazy">
            ${alt && alt !== p.image ? `<img class="is-alt" src="${alt}" alt="" aria-hidden="true" loading="lazy">` : ''}
          </a>
          ${firstVariant && !sold ? `<button class="quick-add" data-add="${firstVariant.id}" data-add-label="${escapeAttr(p.title)}">Quick Add <span aria-hidden="true">+</span></button>` : ''}
        </div>
        <div class="product-card__body">
          <div class="product-card__row">
            <h3 class="product-card__title"><a href="/product.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h3>
            <span class="product-card__price">${priceHtml}</span>
          </div>
          <div class="product-card__meta">
            <span class="stars" aria-hidden="true">${stars(p.rating)}</span>
            <span class="product-card__reviews">${p.rating ? p.rating.toFixed(1) : '—'} · ${(p.reviews || 0).toLocaleString()} reviews</span>
          </div>
          <div class="swatches" role="group" aria-label="Colours">${swatches}</div>
        </div>
      </article>`;
  }
  function mountProducts(container, list) { if (container) container.innerHTML = (list || []).map(productCard).join(''); }
  function stars(r) { const n = Math.round(r || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }

  /* ------------------------------------------------------------------ */
  /* Global delegated events                                             */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (sw && sw.closest('.swatches') && !sw.closest('.pdp')) { $$('.swatch', sw.parentElement).forEach((s) => s.setAttribute('aria-pressed', 'false')); sw.setAttribute('aria-pressed', 'true'); }

    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); addToCart(Number(add.getAttribute('data-add')), 1, { label: add.getAttribute('data-add-label') }); return; }

    const wish = e.target.closest('[data-wish]');
    if (wish) { e.preventDefault(); toggleWishlist(wish.getAttribute('data-wish')); return; }

    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); openCart(); return; }
    if (e.target.closest('[data-cart-close]') || e.target.closest('[data-overlay]')) { closeCart(); return; }

    const inc = e.target.closest('[data-cart-inc]'); if (inc) { const id = Number(inc.getAttribute('data-cart-inc')); const it = state.cart.items.find((i) => i.variantId === id); setCartQty(id, (it ? it.qty : 0) + 1); return; }
    const dec = e.target.closest('[data-cart-dec]'); if (dec) { const id = Number(dec.getAttribute('data-cart-dec')); const it = state.cart.items.find((i) => i.variantId === id); setCartQty(id, (it ? it.qty : 1) - 1); return; }
    const rm = e.target.closest('[data-cart-remove]'); if (rm) { removeCartItem(Number(rm.getAttribute('data-cart-remove'))); return; }

    const cmp = e.target.closest('[data-compare]');
    if (cmp) { e.preventDefault(); toggleCompare(cmp.getAttribute('data-compare')); return; }
    if (e.target.closest('[data-share]')) { const s = e.target.closest('[data-share]'); e.preventDefault(); share({ title: s.getAttribute('data-share-title') || document.title, url: s.getAttribute('data-share-url') || location.href }); return; }

    if (e.target.closest('[data-logout]')) { e.preventDefault(); doLogout(); return; }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart(); closeMenu(); closeSearch();
      const cm = $('.compare-modal.is-open'); if (cm) { cm.classList.remove('is-open'); document.body.style.overflow = ''; }
    }
  });

  async function doLogout() { try { await API.logout(); } catch (_) {} location.href = '/'; }

  /* ------------------------------------------------------------------ */
  /* Mobile nav                                                          */
  /* ------------------------------------------------------------------ */
  function openMenu() { const m = $('#mobileNav'); if (!m) return; m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeMenu() { const m = $('#mobileNav'); if (!m) return; m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function initMenu() { $$('[data-menu-open]').forEach((b) => b.addEventListener('click', openMenu)); $$('[data-menu-close]').forEach((b) => b.addEventListener('click', closeMenu)); }

  /* ------------------------------------------------------------------ */
  /* Search overlay with live autocomplete                               */
  /* ------------------------------------------------------------------ */
  let searchEl = null, searchTimer = null;
  function buildSearch() {
    if (searchEl) return searchEl;
    searchEl = document.createElement('div');
    searchEl.className = 'search-overlay';
    searchEl.setAttribute('role', 'dialog');
    searchEl.setAttribute('aria-modal', 'true');
    searchEl.setAttribute('aria-label', 'Search products');
    searchEl.innerHTML = `
      <div class="search-overlay__panel">
        <form class="search-overlay__bar" role="search">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke="currentColor" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="search" placeholder="Search apparel, harnesses, beds…" aria-label="Search" autocomplete="off">
          <button type="button" class="search-overlay__close" aria-label="Close search">Esc</button>
        </form>
        <div class="search-overlay__results" role="listbox" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(searchEl);
    const input = searchEl.querySelector('input');
    const results = searchEl.querySelector('.search-overlay__results');
    searchEl.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (input.value.trim()) location.href = '/search.html?q=' + encodeURIComponent(input.value.trim()); });
    searchEl.querySelector('.search-overlay__close').addEventListener('click', closeSearch);
    searchEl.addEventListener('mousedown', (e) => { if (e.target === searchEl) closeSearch(); });
    input.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = input.value.trim();
      if (!q) { results.innerHTML = ''; return; }
      searchTimer = setTimeout(async () => {
        try {
          const { results: r } = await API.search(q);
          if (!r.length) { results.innerHTML = '<p class="search-overlay__empty">No matches for “' + escapeHtml(q) + '”.</p>'; return; }
          results.innerHTML = r.slice(0, 6).map((p) => `
            <a class="search-result" href="/product.html?slug=${encodeURIComponent(p.slug)}" role="option">
              <img src="${p.image || ''}" alt="" loading="lazy">
              <span class="search-result__title">${escapeHtml(p.title)}</span>
              <span class="search-result__price">${money(p.priceCents)}</span>
            </a>`).join('') + `<a class="search-result search-result--all" href="/search.html?q=${encodeURIComponent(q)}">See all results for “${escapeHtml(q)}” →</a>`;
        } catch (e) { results.innerHTML = '<p class="search-overlay__empty">' + escapeHtml(e.message) + '</p>'; }
      }, 220);
    });
    return searchEl;
  }
  function openSearch() { const el = buildSearch(); el.classList.add('is-open'); document.body.style.overflow = 'hidden'; setTimeout(() => el.querySelector('input').focus(), 30); }
  function closeSearch() { if (searchEl) { searchEl.classList.remove('is-open'); document.body.style.overflow = ''; } }
  function initSearch() { $$('[data-search-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openSearch(); })); }

  /* ------------------------------------------------------------------ */
  /* Product compare (localStorage-backed tray)                          */
  /* ------------------------------------------------------------------ */
  const compareIds = () => { try { return JSON.parse(localStorage.getItem('lp_compare') || '[]'); } catch { return []; } };
  const saveCompare = (a) => localStorage.setItem('lp_compare', JSON.stringify(a.slice(0, 4)));
  function toggleCompare(slug) {
    let a = compareIds();
    if (a.includes(slug)) a = a.filter((s) => s !== slug);
    else { if (a.length >= 4) { toast('Compare up to 4 items', 'error'); return; } a.push(slug); }
    saveCompare(a); renderCompareTray();
    toast(a.includes(slug) ? 'Added to compare' : 'Removed from compare');
  }
  async function renderCompareTray() {
    let tray = $('.compare-tray');
    const ids = compareIds();
    if (!ids.length) { if (tray) tray.remove(); return; }
    if (!tray) { tray = document.createElement('div'); tray.className = 'compare-tray'; document.body.appendChild(tray); }
    tray.innerHTML = `<span>${ids.length} to compare</span><button class="btn btn--sm" data-compare-open>Compare</button><button class="compare-tray__clear" data-compare-clear aria-label="Clear compare">Clear</button>`;
    tray.querySelector('[data-compare-clear]').addEventListener('click', () => { saveCompare([]); renderCompareTray(); });
    tray.querySelector('[data-compare-open]').addEventListener('click', openCompare);
  }
  async function openCompare() {
    const ids = compareIds();
    const items = (await Promise.all(ids.map((s) => API.product(s).then((d) => d.product).catch(() => null)))).filter(Boolean);
    if (!items.length) return;
    let modal = $('.compare-modal');
    if (!modal) { modal = document.createElement('div'); modal.className = 'compare-modal'; document.body.appendChild(modal); }
    const rows = [
      ['Price', (p) => p.compareAtCents ? `<s>${money(p.compareAtCents)}</s> ${money(p.priceCents)}` : money(p.priceCents)],
      ['Rating', (p) => `${stars(p.rating)} <span style="color:var(--taupe)">(${p.reviews})</span>`],
      ['Category', (p) => escapeHtml(p.categoryName || '—')],
      ['Colours', (p) => (p.colors || []).map((c) => c.name).join(', ') || '—'],
      ['Sizes', (p) => (p.sizes || []).join(', ') || '—'],
      ['In stock', (p) => p.inStock ? 'Yes' : 'No'],
    ];
    modal.innerHTML = `<div class="compare-modal__panel">
      <button class="compare-modal__close" aria-label="Close">✕</button>
      <h2>Compare</h2>
      <div class="compare-grid" style="grid-template-columns:120px repeat(${items.length},1fr)">
        <div></div>${items.map((p) => `<div class="compare-col"><a href="/product.html?slug=${encodeURIComponent(p.slug)}"><img src="${p.image || ''}" alt="${escapeAttr(p.title)}"><strong>${escapeHtml(p.title)}</strong></a></div>`).join('')}
        ${rows.map(([label, fn]) => `<div class="compare-label">${label}</div>${items.map((p) => `<div class="compare-cell">${fn(p)}</div>`).join('')}`).join('')}
      </div></div>`;
    modal.classList.add('is-open'); document.body.style.overflow = 'hidden';
    modal.querySelector('.compare-modal__close').addEventListener('click', () => { modal.classList.remove('is-open'); document.body.style.overflow = ''; });
    modal.addEventListener('mousedown', (e) => { if (e.target === modal) { modal.classList.remove('is-open'); document.body.style.overflow = ''; } });
  }

  /* ------------------------------------------------------------------ */
  /* Social share                                                        */
  /* ------------------------------------------------------------------ */
  async function share(data) {
    const url = data.url || location.href;
    if (navigator.share) { try { await navigator.share({ title: data.title, text: data.text, url }); return; } catch (_) { return; } }
    try { await navigator.clipboard.writeText(url); toast('Link copied to clipboard'); } catch { toast(url); }
  }

  /* ------------------------------------------------------------------ */
  /* Reveal + parallax + before/after + newsletter                       */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }
  function initParallax() {
    const layer = $('[data-parallax] img'); if (!layer || reduceMotion) return;
    let ticking = false;
    const update = () => { layer.style.transform = `translate3d(0, ${Math.min(window.scrollY, innerHeight) * 0.18}px, 0) scale(1.03)`; ticking = false; };
    addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  }
  function initBA() {
    const stage = $('[data-ba]'); if (!stage) return;
    const after = $('[data-ba-after]', stage), divider = $('[data-ba-divider]', stage), range = $('[data-ba-range]', stage);
    const set = (v) => { after.style.clipPath = `inset(0 0 0 ${v}%)`; divider.style.left = v + '%'; };
    range.addEventListener('input', () => set(range.value)); set(50);
  }
  function initNewsletter() {
    $$('[data-newsletter]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type=email]').value;
        try { await API.newsletter(email); form.style.display = 'none'; const s = form.parentElement.querySelector('[data-newsletter-success]'); if (s) s.classList.add('is-visible'); toast("You're on the list 🐾"); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
  }
  function initHeaderScroll() {
    const header = $('#header'); if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  /* ------------------------------------------------------------------ */
  /* Expose + init                                                       */
  /* ------------------------------------------------------------------ */
  window.Loom = {
    state, money, toast, openCart, closeCart, refreshCart, addToCart, setCartQty, removeCartItem, toggleWishlist,
    productCard, mountProducts, stars, syncWishButtons, updateBadges, initReveal, escapeHtml, escapeAttr,
    isAuthed: () => !!state.user, renderHeader, api: API,
    openSearch, toggleCompare, openCompare, compareIds, share,
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll(); initReveal(); initParallax(); initMenu(); initSearch(); initBA(); initNewsletter(); initA11y();
    boot();
  });
})();
