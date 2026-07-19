/* =====================================================================
   LOOMIPAW — Core interactions
   Cart · Wishlist · Reveal · Parallax · Nav · Before/After · Newsletter
   ===================================================================== */
(function () {
  "use strict";

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const money = (n) => "$" + Number(n).toFixed(0);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* State (persisted)                                                   */
  /* ------------------------------------------------------------------ */
  const store = {
    get cart() { try { return JSON.parse(localStorage.getItem("lp_cart") || "[]"); } catch { return []; } },
    set cart(v) { localStorage.setItem("lp_cart", JSON.stringify(v)); },
    get wish() { try { return JSON.parse(localStorage.getItem("lp_wish") || "[]"); } catch { return []; } },
    set wish(v) { localStorage.setItem("lp_wish", JSON.stringify(v)); },
    get recent() { try { return JSON.parse(localStorage.getItem("lp_recent") || "[]"); } catch { return []; } },
    set recent(v) { localStorage.setItem("lp_recent", JSON.stringify(v)); }
  };

  const products = window.LOOMIPAW_PRODUCTS || [];
  const byId = (id) => products.find((p) => p.id === id);

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg) {
    const el = $("[data-toast]");
    if (!el) return;
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m20 6-11 11-5-5"/></svg>' + msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Header scroll state                                                 */
  /* ------------------------------------------------------------------ */
  const header = $("#header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Hero parallax                                                       */
  /* ------------------------------------------------------------------ */
  function initParallax() {
    const layer = $("[data-parallax] img");
    if (!layer || reduceMotion) return;
    let ticking = false;
    const update = () => {
      const y = Math.min(window.scrollY, window.innerHeight);
      layer.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(1.02)`;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile nav                                                          */
  /* ------------------------------------------------------------------ */
  function initMenu() {
    const menu = $("#mobileNav");
    if (!menu) return;
    const open = () => { menu.classList.add("is-open"); menu.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; };
    const close = () => { menu.classList.remove("is-open"); menu.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; };
    $$("[data-menu-open]").forEach((b) => b.addEventListener("click", open));
    $$("[data-menu-close]").forEach((b) => b.addEventListener("click", close));
  }

  /* ------------------------------------------------------------------ */
  /* Cart drawer                                                         */
  /* ------------------------------------------------------------------ */
  const cartEl = $("#cart");
  const overlay = $("[data-overlay]");
  const FREE_SHIP = 75;

  function openCart() {
    if (!cartEl) return;
    cartEl.classList.add("is-open");
    cartEl.setAttribute("aria-hidden", "false");
    overlay && overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    if (!cartEl) return;
    cartEl.classList.remove("is-open");
    cartEl.setAttribute("aria-hidden", "true");
    overlay && overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function addToCart(id, opts = {}) {
    const p = byId(id);
    if (!p) return;
    const color = opts.color || (p.colors[0] && p.colors[0].name);
    const size = opts.size || (p.sizes[0]);
    const qty = opts.qty || 1;
    const key = `${id}::${color}::${size}`;
    const cart = store.cart;
    const line = cart.find((l) => l.key === key);
    if (line) line.qty += qty;
    else cart.push({ key, id, title: p.title, price: p.price, img: p.img, color, size, qty });
    store.cart = cart;
    renderCart();
    updateBadges();
    toast(`${p.title} added to cart`);
    if (opts.open !== false) openCart();
  }

  function setQty(key, delta) {
    const cart = store.cart;
    const line = cart.find((l) => l.key === key);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) store.cart = cart.filter((l) => l.key !== key);
    else store.cart = cart;
    renderCart();
    updateBadges();
  }
  function removeLine(key) {
    store.cart = store.cart.filter((l) => l.key !== key);
    renderCart();
    updateBadges();
  }

  function renderCart() {
    const wrap = $("[data-cart-items]");
    if (!wrap) return;
    const cart = store.cart;
    const foot = $("[data-cart-foot]");
    const titleCount = $("[data-cart-title-count]");
    const count = cart.reduce((n, l) => n + l.qty, 0);
    if (titleCount) titleCount.textContent = count ? `(${count})` : "";

    if (!cart.length) {
      wrap.innerHTML =
        '<div class="cart__empty"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.4"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg><p>Your cart is empty.</p><p style="margin-top:.5rem;font-size:.85rem">Beautiful things await your best friend.</p></div>';
      foot && (foot.hidden = true);
      return;
    }
    wrap.innerHTML = cart.map((l) => `
      <div class="cart-item">
        <div class="cart-item__img"><img src="${l.img}" alt="${l.title}" loading="lazy"></div>
        <div>
          <div class="cart-item__title">${l.title}</div>
          <div class="cart-item__variant">${l.color} · ${l.size}</div>
          <div class="cart-item__qty">
            <button aria-label="Decrease quantity" data-qty="-1" data-key="${l.key}">−</button>
            <span>${l.qty}</span>
            <button aria-label="Increase quantity" data-qty="1" data-key="${l.key}">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div class="cart-item__price">${money(l.price * l.qty)}</div>
          <button class="cart-item__remove" data-remove="${l.key}">Remove</button>
        </div>
      </div>`).join("");

    const subtotal = cart.reduce((n, l) => n + l.price * l.qty, 0);
    $("[data-cart-subtotal]") && ($("[data-cart-subtotal]").textContent = money(subtotal));
    const ship = $("[data-cart-ship]");
    if (ship) {
      if (subtotal >= FREE_SHIP) ship.innerHTML = "🎉 You've unlocked <b>free carbon-neutral shipping!</b>";
      else ship.innerHTML = `Add <b>${money(FREE_SHIP - subtotal)}</b> more for free shipping.`;
    }
    foot && (foot.hidden = false);
  }

  /* ------------------------------------------------------------------ */
  /* Wishlist                                                            */
  /* ------------------------------------------------------------------ */
  function toggleWish(id) {
    let wish = store.wish;
    const has = wish.includes(id);
    if (has) wish = wish.filter((x) => x !== id);
    else wish.push(id);
    store.wish = wish;
    updateBadges();
    syncWishButtons();
    const p = byId(id);
    toast(has ? `Removed from wishlist` : `${p ? p.title : "Item"} saved to wishlist`);
    return !has;
  }
  function syncWishButtons() {
    const wish = store.wish;
    $$("[data-wish]").forEach((b) => {
      const active = wish.includes(b.getAttribute("data-wish"));
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateBadges() {
    const cartCount = store.cart.reduce((n, l) => n + l.qty, 0);
    $$("[data-cart-badge]").forEach((b) => { b.textContent = cartCount; b.hidden = cartCount === 0; });
    const wishCount = store.wish.length;
    $$("[data-wishlist-badge]").forEach((b) => { b.textContent = wishCount; b.hidden = wishCount === 0; });
  }

  /* ------------------------------------------------------------------ */
  /* Product card factory (used on home + collection)                    */
  /* ------------------------------------------------------------------ */
  function productCard(p) {
    const wish = store.wish.includes(p.id);
    const priceHtml = p.compareAt
      ? `<s>${money(p.compareAt)}</s>${money(p.price)}`
      : money(p.price);
    const tagHtml = p.tag
      ? `<span class="product-card__tag ${p.tag === "Sale" ? "product-card__tag--sale" : ""}">${p.tag}</span>`
      : "";
    const swatches = p.colors.map((c, i) =>
      `<button class="swatch" style="background:${c.hex}" aria-label="${c.name}" title="${c.name}" aria-pressed="${i === 0}"></button>`).join("");
    const stars = "★★★★★";
    return `
      <article class="product-card" data-card="${p.id}">
        <div class="product-card__media">
          ${tagHtml}
          <button class="wishlist-btn ${wish ? "is-active" : ""}" data-wish="${p.id}" aria-label="Save ${p.title} to wishlist" aria-pressed="${wish}">
            <svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M12 20s-7-4.5-9.5-9C.5 7 3 3.5 6.5 3.5 9 3.5 12 6 12 6s3-2.5 5.5-2.5C21 3.5 23.5 7 21.5 11 19 15.5 12 20 12 20z"/></svg>
          </button>
          <a href="product.html?id=${p.id}" aria-label="${p.title}" tabindex="-1">
            <img class="is-main" src="${p.img}" alt="${p.title}" loading="lazy">
            <img class="is-alt" src="${p.imgAlt}" alt="" aria-hidden="true" loading="lazy">
          </a>
          <button class="quick-add" data-add="${p.id}">Quick Add <span aria-hidden="true">+</span></button>
        </div>
        <div class="product-card__body">
          <div class="product-card__row">
            <h3 class="product-card__title"><a href="product.html?id=${p.id}">${p.title}</a></h3>
            <span class="product-card__price">${priceHtml}</span>
          </div>
          <div class="product-card__meta">
            <span class="stars" aria-hidden="true">${stars}</span>
            <span class="product-card__reviews">${p.rating} · ${p.reviews.toLocaleString()} reviews</span>
          </div>
          <div class="swatches" role="group" aria-label="Colours">${swatches}</div>
        </div>
      </article>`;
  }

  function mountProducts(container, list) {
    if (!container) return;
    container.innerHTML = list.map(productCard).join("");
  }

  // Home best sellers
  const homeGrid = $("[data-products]");
  if (homeGrid) mountProducts(homeGrid, products.filter((p) => p.bestSeller).slice(0, 8));

  /* ------------------------------------------------------------------ */
  /* Swatch selection within cards                                       */
  /* ------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const sw = e.target.closest(".swatch");
    if (sw && sw.closest(".swatches")) {
      $$(".swatch", sw.parentElement).forEach((s) => s.setAttribute("aria-pressed", "false"));
      sw.setAttribute("aria-pressed", "true");
    }
  });

  /* ------------------------------------------------------------------ */
  /* Global click delegation                                             */
  /* ------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { addToCart(add.getAttribute("data-add")); return; }

    const wish = e.target.closest("[data-wish]");
    if (wish) { e.preventDefault(); toggleWish(wish.getAttribute("data-wish")); return; }

    if (e.target.closest("[data-cart-open]")) { openCart(); return; }
    if (e.target.closest("[data-cart-close]") || e.target.closest("[data-overlay]")) { closeCart(); return; }

    const qty = e.target.closest("[data-qty]");
    if (qty) { setQty(qty.getAttribute("data-key"), Number(qty.getAttribute("data-qty"))); return; }

    const rm = e.target.closest("[data-remove]");
    if (rm) { removeLine(rm.getAttribute("data-remove")); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeCart(); const m = $("#mobileNav"); if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden","true"); document.body.style.overflow=""; } }
  });

  /* ------------------------------------------------------------------ */
  /* Before / After slider                                               */
  /* ------------------------------------------------------------------ */
  function initBA() {
    const stage = $("[data-ba]");
    if (!stage) return;
    const after = $("[data-ba-after]", stage);
    const divider = $("[data-ba-divider]", stage);
    const range = $("[data-ba-range]", stage);
    const set = (v) => {
      after.style.clipPath = `inset(0 0 0 ${v}%)`;
      divider.style.left = v + "%";
    };
    range.addEventListener("input", () => set(range.value));
    set(50);
  }

  /* ------------------------------------------------------------------ */
  /* Newsletter                                                          */
  /* ------------------------------------------------------------------ */
  function initNewsletter() {
    const form = $("[data-newsletter]");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const success = $("[data-newsletter-success]");
      form.style.display = "none";
      if (success) success.classList.add("is-visible");
      toast("You're on the list 🐾");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */
  initReveal();
  initParallax();
  initMenu();
  initBA();
  initNewsletter();
  renderCart();
  updateBadges();
  syncWishButtons();

  // Expose for other page scripts
  window.LOOMIPAW = { addToCart, toggleWish, openCart, toast, store, byId, productCard, mountProducts, money, syncWishButtons, updateBadges, initReveal };
})();
