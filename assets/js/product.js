/* =====================================================================
   LOOMIPAW — Product detail page
   Variants · Gallery · Sticky bar · Accordions · Recs · Recently viewed
   ===================================================================== */
(function () {
  "use strict";
  const LP = window.LOOMIPAW;
  const products = window.LOOMIPAW_PRODUCTS || [];
  if (!LP) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const params = new URLSearchParams(location.search);
  const id = params.get("id") || (products[0] && products[0].id);
  const p = LP.byId(id) || products[0];
  if (!p) return;

  const state = {
    color: p.colors[0].name,
    size: p.sizes[0],
    qty: 1
  };

  const savings = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
  const gallery = [p.img, p.imgAlt, p.img, p.imgAlt];

  /* ---- Meta / SEO ---- */
  document.title = `${p.title} — Loomipaw`;
  $("[data-pdp-crumb]").textContent = p.title;
  $("[data-pdp-cat]").textContent = p.category;
  $("[data-pdp-title]").textContent = p.title;
  $("[data-pdp-reviews]").textContent = `${p.rating} · ${p.reviews.toLocaleString()} reviews`;
  $("[data-pdp-score]").textContent = p.rating.toFixed(1);
  $("[data-pdp-desc]").textContent =
    "Designed in-house and comfort-tested by real dogs, the " + p.title +
    " brings considered detail and enduring quality to everyday life with your best friend.";

  /* ---- Price ---- */
  function renderPrice() {
    const el = $("[data-pdp-price]");
    el.innerHTML = p.compareAt
      ? `<span class="now">${LP.money(p.price)}</span><s>${LP.money(p.compareAt)}</s><span class="save">Save ${savings}%</span>`
      : `<span class="now">${LP.money(p.price)}</span>`;
  }
  renderPrice();

  /* ---- Gallery ---- */
  const mainImg = $("[data-pdp-main]");
  mainImg.src = gallery[0];
  mainImg.alt = p.title;
  const thumbs = $("[data-pdp-thumbs]");
  thumbs.innerHTML = gallery.map((src, i) =>
    `<button class="pdp__thumb" data-thumb="${i}" aria-current="${i === 0}" aria-label="View image ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`
  ).join("");
  thumbs.addEventListener("click", (e) => {
    const t = e.target.closest("[data-thumb]");
    if (!t) return;
    mainImg.src = gallery[Number(t.getAttribute("data-thumb"))];
    $$(".pdp__thumb", thumbs).forEach((b) => b.setAttribute("aria-current", "false"));
    t.setAttribute("aria-current", "true");
  });

  /* ---- Colours ---- */
  const colorWrap = $("[data-pdp-colors]");
  colorWrap.innerHTML = p.colors.map((c, i) =>
    `<button class="opt__color" style="background:${c.hex}" data-color="${c.name}" aria-label="${c.name}" title="${c.name}" aria-pressed="${i === 0}"></button>`
  ).join("");
  $("[data-pdp-color-name]").textContent = state.color;
  colorWrap.addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]");
    if (!b) return;
    state.color = b.getAttribute("data-color");
    $("[data-pdp-color-name]").textContent = state.color;
    $$(".opt__color", colorWrap).forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
  });

  /* ---- Sizes ---- */
  const sizeWrap = $("[data-pdp-sizes]");
  sizeWrap.innerHTML = p.sizes.map((s, i) =>
    `<button class="opt__size" data-size="${s}" aria-pressed="${i === 0}">${s}</button>`
  ).join("");
  sizeWrap.addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]");
    if (!b) return;
    state.size = b.getAttribute("data-size");
    $$(".opt__size", sizeWrap).forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
  });

  /* ---- Qty ---- */
  const qtyVal = $("[data-pdp-qty-val]");
  $$("[data-pdp-qty]").forEach((btn) => btn.addEventListener("click", () => {
    state.qty = Math.max(1, state.qty + Number(btn.getAttribute("data-pdp-qty")));
    qtyVal.textContent = state.qty;
  }));

  /* ---- Add price on button ---- */
  $("[data-pdp-add-price]").textContent = LP.money(p.price);

  /* ---- Add to cart ---- */
  function add() { LP.addToCart(p.id, { color: state.color, size: state.size, qty: state.qty }); }
  $("[data-pdp-add]").addEventListener("click", add);

  /* ---- Wishlist ---- */
  const wishLine = $("[data-pdp-wish]");
  function syncWish() {
    const active = LP.store.wish.includes(p.id);
    wishLine.classList.toggle("is-active", active);
    $("[data-pdp-wish-label]").textContent = active ? "Saved to wishlist" : "Save to wishlist";
  }
  syncWish();
  const doWish = () => { LP.toggleWish(p.id); syncWish(); };
  wishLine.addEventListener("click", doWish);
  wishLine.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doWish(); } });

  /* ---- Accordion ---- */
  $$("[data-accordion] .accordion__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const panel = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", String(!expanded));
      panel.style.maxHeight = expanded ? "0" : panel.scrollHeight + "px";
    });
  });

  /* ---- Sticky bar ---- */
  const sticky = $("[data-sticky]");
  $("[data-sticky-img]").src = p.img;
  $("[data-sticky-img]").alt = p.title;
  $("[data-sticky-title]").textContent = p.title;
  $("[data-sticky-price]").textContent = LP.money(p.price);
  $("[data-sticky-add]").addEventListener("click", add);
  const addBtn = $("[data-pdp-add]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => sticky.classList.toggle("is-visible", !e.isIntersecting && e.boundingClientRect.top < 0));
    }, { threshold: 0 });
    io.observe(addBtn);
  }

  /* ---- Recommendations (same category, else best sellers) ---- */
  let recs = products.filter((x) => x.id !== p.id && x.category === p.category);
  if (recs.length < 4) recs = recs.concat(products.filter((x) => x.id !== p.id && x.category !== p.category));
  LP.mountProducts($("[data-pdp-recs]"), recs.slice(0, 4));

  /* ---- Recently viewed ---- */
  let recent = LP.store.recent.filter((rid) => rid !== p.id);
  const recentList = recent.map(LP.byId).filter(Boolean).slice(0, 4);
  if (recentList.length) {
    $("[data-recent-section]").hidden = false;
    LP.mountProducts($("[data-pdp-recent]"), recentList);
  }
  // Save current as recently viewed (front of list, unique, cap 8)
  recent = [p.id, ...LP.store.recent.filter((rid) => rid !== p.id)].slice(0, 8);
  LP.store.recent = recent;

  LP.syncWishButtons();
  LP.updateBadges();
  LP.initReveal();
})();
