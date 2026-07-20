/* Product detail page — variants, gallery, reviews, sticky bar, recs. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || params.get('id');
  const root = $('[data-pdp]');
  if (!root) return;

  const sel = { color: null, size: null, qty: 1 };
  let product = null;

  init();
  async function init() {
    if (!slug) { root.innerHTML = notFound(); return; }
    try {
      const data = await API.product(slug);
      product = data.product;
      render(data);
    } catch (e) {
      root.innerHTML = notFound(e.message);
    }
  }

  function money(c) { return Loom.money(c); }

  function currentVariant() {
    return (product.variants || []).find((v) =>
      (v.color || '') === (sel.color || '') && (v.size || '') === (sel.size || '')) || null;
  }

  function render(data) {
    document.title = `${product.title} — Loomipaw`;
    setMeta('description', product.seoDescription || product.subtitle || product.description);

    const images = product.images.length ? product.images : [{ url: product.image }];
    // Default to the first in-stock variant so buyers land on something available.
    const firstAvail = (product.variants || []).find((v) => v.stock > 0) || (product.variants || [])[0] || {};
    sel.color = firstAvail.color || (product.colors[0] ? product.colors[0].name : '');
    sel.size = firstAvail.size || (product.sizes[0] || '');

    const savings = product.compareAtCents ? Math.round((1 - product.priceCents / product.compareAtCents) * 100) : 0;

    root.innerHTML = `
      <div class="container">
        <p class="breadcrumb"><a href="/">Home</a> / <a href="/collection.html">Shop</a> / <span>${esc(product.title)}</span></p>
        <div class="pdp__grid">
          <div class="pdp__gallery">
            <div class="pdp__main"><img data-main src="${images[0].url}" alt="${escAttr(product.title)}" fetchpriority="high"></div>
            <div class="pdp__thumbs">${images.map((im, i) => `<button class="pdp__thumb" data-thumb="${i}" aria-current="${i === 0}" aria-label="View image ${i + 1}"><img src="${im.url}" alt="" loading="lazy"></button>`).join('')}</div>
          </div>
          <div class="pdp__info">
            <p class="pdp__cat">${esc(product.categoryName || '')}</p>
            <h1 class="pdp__title">${esc(product.title)}</h1>
            <div class="pdp__meta">
              <span class="stars" aria-hidden="true">${Loom.stars(product.rating)}</span>
              <a href="#reviews">${product.rating ? product.rating.toFixed(1) : '—'} · ${(product.reviews || 0).toLocaleString()} reviews</a>
            </div>
            <div class="pdp__price">
              <span class="now">${money(product.priceCents)}</span>
              ${product.compareAtCents ? `<s>${money(product.compareAtCents)}</s><span class="save">Save ${savings}%</span>` : ''}
            </div>
            <p class="pdp__desc">${esc(product.description)}</p>

            ${product.colors.length ? `<div class="opt">
              <div class="opt__label">Colour — <span data-color-name>${esc(sel.color)}</span></div>
              <div class="opt__colors">${product.colors.map((c) => `<button class="opt__color" style="background:${c.hex}" data-color="${escAttr(c.name)}" aria-label="${escAttr(c.name)}" title="${escAttr(c.name)}" aria-pressed="${c.name === sel.color}"></button>`).join('')}</div>
            </div>` : ''}

            ${product.sizes.length ? `<div class="opt">
              <div class="opt__label">Size <span><a href="#" data-size-guide style="text-decoration:underline">Size guide</a></span></div>
              <div class="opt__sizes">${product.sizes.map((s) => `<button class="opt__size" data-size="${escAttr(s)}" aria-pressed="${s === sel.size}">${esc(s)}</button>`).join('')}</div>
            </div>` : ''}

            <p class="pdp__stock" data-stock></p>

            <div class="pdp__buy">
              <div class="qty-stepper">
                <button aria-label="Decrease" data-qty="-1">−</button>
                <span data-qty-val>1</span>
                <button aria-label="Increase" data-qty="1">+</button>
              </div>
              <button class="btn" data-buy>Add to Cart — <span data-buy-price>${money(product.priceCents)}</span></button>
            </div>

            <div class="pdp__wish-line" role="button" tabindex="0" data-wish="${product.id}">
              <svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M12 20s-7-4.5-9.5-9C.5 7 3 3.5 6.5 3.5 9 3.5 12 6 12 6s3-2.5 5.5-2.5C21 3.5 23.5 7 21.5 11 19 15.5 12 20 12 20z"/></svg>
              <span data-wish-label>Save to wishlist</span>
            </div>
            <div class="pdp__share">
              <button type="button" data-compare="${product.slug}"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M3 6h13M3 12h13M3 18h13M18 8l3 3-3 3"/></svg> Compare</button>
              <button type="button" data-share data-share-title="${escAttr(product.title)}"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg> Share</button>
            </div>

            <div class="pdp__usps">
              <div class="pdp__usp"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M3 7h13v10H3z"/><path d="M16 10h4l1 3v4h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg><span><b>Free carbon-neutral shipping</b>on orders over $75</span></div>
              <div class="pdp__usp"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v6h6"/></svg><span><b>30-day happiness guarantee</b>Free returns, no questions asked</span></div>
              <div class="pdp__usp"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3z"/><path d="m9 12 2 2 4-4"/></svg><span><b>OEKO-TEX® certified materials</b>Safe on skin, gentle on the planet</span></div>
            </div>

            <div class="accordion" data-accordion>
              <div class="accordion__item"><button class="accordion__btn" aria-expanded="false"><span>Details &amp; Materials</span><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg></button><div class="accordion__panel"><div class="accordion__panel-inner">${esc(product.details || '')}</div></div></div>
              <div class="accordion__item"><button class="accordion__btn" aria-expanded="false"><span>Sizing &amp; Fit</span><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg></button><div class="accordion__panel"><div class="accordion__panel-inner">Measure your dog’s chest at its widest point and neck circumference. Between sizes? We recommend sizing up.</div></div></div>
              <div class="accordion__item"><button class="accordion__btn" aria-expanded="false"><span>Shipping &amp; Returns</span><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg></button><div class="accordion__panel"><div class="accordion__panel-inner">Ships within 1–2 business days. Complimentary carbon-neutral shipping over $75. 30-day happiness guarantee with free returns.</div></div></div>
            </div>
          </div>
        </div>
      </div>`;

    wireGallery();
    wireOptions();
    updateStock();
    Loom.syncWishButtons();
    wireWishLabel();
    renderReviews(data);
    renderRelated(data.related);
    renderRecent();
    wireStickyBar();
    Loom.initReveal();
    Loom.track('view_item', { value: product.priceCents, items: [{ id: product.slug, name: product.title, price: product.priceCents, qty: 1 }] });
  }

  function wireGallery() {
    const main = $('[data-main]');
    $$('.pdp__thumb').forEach((t) => t.addEventListener('click', () => {
      const i = Number(t.getAttribute('data-thumb'));
      main.src = product.images[i].url;
      $$('.pdp__thumb').forEach((b) => b.setAttribute('aria-current', 'false'));
      t.setAttribute('aria-current', 'true');
    }));
  }

  function wireOptions() {
    $$('[data-color]').forEach((b) => b.addEventListener('click', () => {
      sel.color = b.getAttribute('data-color');
      $$('[data-color]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const n = $('[data-color-name]'); if (n) n.textContent = sel.color;
      updateStock();
    }));
    $$('[data-size]').forEach((b) => b.addEventListener('click', () => {
      sel.size = b.getAttribute('data-size');
      $$('[data-size]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      updateStock();
    }));
    $$('[data-qty]').forEach((b) => b.addEventListener('click', () => {
      const v = currentVariant();
      sel.qty = Math.max(1, Math.min(v ? v.stock : 99, sel.qty + Number(b.getAttribute('data-qty'))));
      $('[data-qty-val]').textContent = sel.qty;
    }));
    $('[data-buy]').addEventListener('click', buy);
    $$('[data-accordion] .accordion__btn').forEach((btn) => btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const panel = btn.nextElementSibling;
      panel.style.maxHeight = expanded ? '0' : panel.scrollHeight + 'px';
    }));
    $('[data-size-guide]')?.addEventListener('click', (e) => { e.preventDefault(); Loom.toast('Size guide: measure chest & neck — size up if between sizes.'); });
    const wl = $('[data-wish]');
    wl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Loom.toggleWishlist(product.id).then(wireWishLabel); } });
    wl.addEventListener('click', () => setTimeout(wireWishLabel, 50));
  }

  function updateSizeAvailability() {
    // Mark sizes with no stock for the currently selected colour.
    let firstAvailSize = null;
    $$('[data-size]').forEach((b) => {
      const size = b.getAttribute('data-size');
      const v = (product.variants || []).find((x) => (x.color || '') === (sel.color || '') && (x.size || '') === size);
      const out = !v || v.stock <= 0;
      b.classList.toggle('is-out', out);
      b.disabled = out;
      if (!out && firstAvailSize === null) firstAvailSize = size;
    });
    // If current size is unavailable for this colour, jump to an available one.
    const cur = currentVariant();
    if ((!cur || cur.stock <= 0) && firstAvailSize) {
      sel.size = firstAvailSize;
      $$('[data-size]').forEach((x) => x.setAttribute('aria-pressed', x.getAttribute('data-size') === sel.size ? 'true' : 'false'));
    }
  }

  function updateStock() {
    updateSizeAvailability();
    const v = currentVariant();
    const el = $('[data-stock]');
    const buy = $('[data-buy]');
    const priceEl = $('[data-buy-price]');
    if (sel.qty < 1) sel.qty = 1;
    if (v) {
      priceEl.textContent = money(v.priceCents);
      if (v.stock <= 0) { el.textContent = 'Out of stock in this option'; el.className = 'pdp__stock is-out'; buy.disabled = true; buy.firstChild && (buy.childNodes[0].nodeValue = 'Sold out'); }
      else {
        buy.disabled = false;
        if (buy.childNodes[0]) buy.childNodes[0].nodeValue = 'Add to Cart — ';
        el.className = 'pdp__stock';
        el.textContent = v.lowStock ? `Only ${v.stock} left — order soon` : (v.stock <= 10 ? `${v.stock} in stock` : 'In stock');
        if (sel.qty > v.stock) { sel.qty = v.stock; $('[data-qty-val]').textContent = sel.qty; }
      }
    } else { el.textContent = 'Select options'; }
    syncSticky();
  }

  async function buy() {
    const v = currentVariant();
    if (!v) return Loom.toast('Please choose available options', 'error');
    if (v.stock <= 0) return Loom.toast('That option is sold out', 'error');
    await Loom.addToCart(v.id, sel.qty, { label: product.title });
  }

  function wireWishLabel() {
    const active = Loom.state.wishlist.has(product.id);
    const wl = $('[data-wish]'); if (!wl) return;
    wl.classList.toggle('is-active', active);
    const lbl = $('[data-wish-label]'); if (lbl) lbl.textContent = active ? 'Saved to wishlist' : 'Save to wishlist';
  }

  /* Reviews */
  function renderReviews(data) {
    const wrap = $('[data-reviews]'); if (!wrap) return;
    const sum = data.reviewSummary;
    const dist = sum.distribution || {};
    const total = sum.count || 0;
    const bar = (n) => total ? Math.round((dist[n] || 0) / total * 100) : 0;
    wrap.innerHTML = `
      <div class="container">
        <div class="section-head"><div class="section-head__text"><p class="eyebrow">Verified Reviews</p><h2>What the pack is saying.</h2></div>
          <button class="btn btn--ghost" data-write-review>Write a review</button></div>
        <div class="pdp-reviews__summary">
          <div class="pdp-reviews__score">${(sum.average || 0).toFixed(1)}</div>
          <div class="pdp-reviews__bars">
            ${[5, 4, 3, 2, 1].map((n) => `<div class="pdp-reviews__bar"><span>${n}★</span><div class="pdp-reviews__bar-track"><div class="pdp-reviews__bar-fill" style="width:${bar(n)}%"></div></div><span>${bar(n)}%</span></div>`).join('')}
          </div>
        </div>
        <form class="review-form" data-review-form hidden>
          <div class="review-form__stars" data-star-input>${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} stars">★</button>`).join('')}</div>
          <input type="text" name="title" placeholder="Review title" maxlength="140">
          <textarea name="body" placeholder="Share your experience…" required maxlength="3000"></textarea>
          ${Loom.isAuthed() ? '' : '<input type="text" name="name" placeholder="Your name" maxlength="120">'}
          <button class="btn" type="submit">Submit review</button>
        </form>
        <div class="review-list" data-review-list>${reviewTiles(data.reviews)}</div>
      </div>`;
    wireReviewForm();
  }
  function reviewTiles(reviews) {
    if (!reviews || !reviews.length) return '<p style="color:var(--ink-2)">No reviews yet — be the first to share.</p>';
    return reviews.map((r) => `
      <article class="review-tile">
        <div class="review-tile__stars" aria-hidden="true">${Loom.stars(r.rating)}</div>
        ${r.title ? `<p class="review-tile__title">${esc(r.title)}</p>` : ''}
        <p class="review-tile__body">${esc(r.body)}</p>
        <p class="review-tile__author">${esc(r.author_name)}${r.verified ? ' · <span style="color:var(--clay)">Verified Buyer</span>' : ''}</p>
      </article>`).join('');
  }
  function wireReviewForm() {
    let rating = 5;
    const form = $('[data-review-form]');
    $('[data-write-review]')?.addEventListener('click', () => { form.hidden = !form.hidden; if (!form.hidden) form.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    const stars = $$('[data-star]');
    const paint = () => stars.forEach((s) => s.classList.toggle('is-on', Number(s.getAttribute('data-star')) <= rating));
    stars.forEach((s) => s.addEventListener('click', () => { rating = Number(s.getAttribute('data-star')); paint(); }));
    paint();
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        const res = await API.addReview(product.slug, { rating, title: fd.get('title') || '', body: fd.get('body'), name: fd.get('name') || undefined });
        Loom.toast(res.message || 'Thank you for your review!');
        form.reset(); form.hidden = true;
      } catch (err) { Loom.toast(err.message, 'error'); }
    });
  }

  function renderRelated(related) {
    const el = $('[data-recs]'); if (!el || !related) return;
    Loom.mountProducts(el, related); Loom.syncWishButtons();
  }

  /* Recently viewed (localStorage of slugs) */
  function renderRecent() {
    let recent = []; try { recent = JSON.parse(localStorage.getItem('lp_recent') || '[]'); } catch {}
    const others = recent.filter((s) => s !== product.slug).slice(0, 4);
    const section = $('[data-recent-section]');
    if (others.length && section) {
      Promise.all(others.map((s) => API.product(s).then((d) => d.product).catch(() => null)))
        .then((items) => {
          const good = items.filter(Boolean);
          if (good.length) { section.hidden = false; Loom.mountProducts($('[data-recent]'), good); Loom.syncWishButtons(); }
        });
    }
    localStorage.setItem('lp_recent', JSON.stringify([product.slug, ...recent.filter((s) => s !== product.slug)].slice(0, 8)));
  }

  /* Sticky add-to-cart bar */
  function wireStickyBar() {
    const bar = $('[data-sticky]'); if (!bar) return;
    $('[data-sticky-img]').src = product.image || '';
    $('[data-sticky-title]').textContent = product.title;
    syncSticky();
    $('[data-sticky-add]').addEventListener('click', buy);
    const anchor = $('[data-buy]');
    if ('IntersectionObserver' in window && anchor) {
      new IntersectionObserver((entries) => entries.forEach((e) => bar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0)), { threshold: 0 }).observe(anchor);
    }
  }
  function syncSticky() {
    const v = currentVariant();
    const p = $('[data-sticky-price]'); if (p) p.textContent = money(v ? v.priceCents : product.priceCents);
  }

  function notFound(msg) {
    return `<div class="container" style="padding:6rem 0;text-align:center"><h1>Product not found</h1><p style="margin:1rem 0 2rem;color:var(--ink-2)">${esc(msg || 'This product may have been removed.')}</p><a class="btn" href="/collection.html">Back to shop</a></div>`;
  }
  function esc(s) { return Loom.escapeHtml(s); }
  function escAttr(s) { return Loom.escapeAttr(s); }
  function setMeta(name, content) { let m = document.querySelector(`meta[name="${name}"]`); if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); } m.content = content || ''; }
})();
