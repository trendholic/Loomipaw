/* Collection page — server-side filtering, sorting, infinite scroll. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const $ = (s) => document.querySelector(s);
  const grid = $('[data-collection]');
  const countEl = $('[data-count]');
  const filterWrap = $('[data-filters]');
  const sortSel = $('[data-sort]');
  if (!grid) return;

  const PER_PAGE = 9;
  let activeFilter = 'all';
  let activeSort = 'featured';
  let page = 1, totalPages = 1, loading = false;
  let sentinel = null, io = null;

  const params = new URLSearchParams(location.search);
  if (params.get('category')) activeFilter = params.get('category');

  let categories = [];
  const heroTitle = document.querySelector('.page-hero h1');
  const heroDesc = document.querySelector('.page-hero p:not(.breadcrumb):not(.eyebrow)');

  async function loadCategories() {
    if (!filterWrap) return;
    try {
      categories = (await API.categories()).categories || [];
      filterWrap.innerHTML = ['<button class="filter-chip" data-filter="all">All</button>']
        .concat(categories.map((c) => `<button class="filter-chip" data-filter="${c.slug}">${Loom.escapeHtml(c.name)}</button>`)).join('');
      setActive();
    } catch (_) {}
  }
  function setActive() {
    filterWrap && filterWrap.querySelectorAll('.filter-chip').forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-filter') === activeFilter ? 'true' : 'false'));
    updateIntro();
  }
  // Reflect the active category in the visible hero + document title (UX;
  // crawlers already get server-rendered <title>/<meta> from seo.js).
  function updateIntro() {
    const cat = categories.find((c) => c.slug === activeFilter);
    if (cat) {
      if (heroTitle) heroTitle.textContent = cat.name;
      if (heroDesc && cat.description) heroDesc.textContent = cat.description;
      document.title = `${cat.name} — Loomipaw`;
    } else {
      if (heroTitle) heroTitle.textContent = 'Essentials, elevated.';
      if (heroDesc) heroDesc.textContent = 'Every piece is designed in-house, comfort-tested by real dogs, and made to last. Filter by what your best friend needs today.';
      document.title = 'Shop All — Loomipaw';
    }
  }

  function queryString() {
    const qs = new URLSearchParams();
    if (activeFilter && activeFilter !== 'all') qs.set('category', activeFilter);
    qs.set('sort', activeSort);
    qs.set('limit', PER_PAGE);
    qs.set('page', page);
    return qs.toString();
  }

  async function reset() {
    page = 1; loading = false;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '';
    if (io) io.disconnect();
    await loadPage(true);
    grid.removeAttribute('aria-busy');
    setupSentinel();
  }

  async function loadPage(replace) {
    if (loading) return;
    loading = true;
    try {
      const { products, pagination } = await API.products(queryString());
      totalPages = pagination.pages;
      if (replace && !products.length) {
        grid.innerHTML = '<div class="empty-state">No pieces in this collection yet — check back soon.</div>';
      } else {
        grid.insertAdjacentHTML('beforeend', products.map((p) => Loom.productCard(p)).join(''));
        Loom.syncWishButtons(); Loom.initReveal();
      }
      if (countEl) countEl.textContent = `${pagination.total} ${pagination.total === 1 ? 'piece' : 'pieces'}`;
    } catch (e) {
      if (replace) grid.innerHTML = `<div class="empty-state">Couldn’t load products. ${Loom.escapeHtml(e.message)}</div>`;
    } finally { loading = false; }
  }

  function setupSentinel() {
    if (!sentinel) { sentinel = document.createElement('div'); sentinel.className = 'infinite-sentinel'; grid.after(sentinel); }
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && !loading && page < totalPages) {
        page++;
        const note = document.createElement('div'); note.className = 'loading-more'; note.textContent = 'Loading more…'; grid.after(note);
        await loadPage(false);
        note.remove();
      }
    }, { rootMargin: '400px' });
    io.observe(sentinel);
  }

  if (filterWrap) filterWrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip'); if (!chip) return;
    activeFilter = chip.getAttribute('data-filter'); setActive();
    const u = new URL(location); if (activeFilter === 'all') u.searchParams.delete('category'); else u.searchParams.set('category', activeFilter);
    history.replaceState({}, '', u); reset();
  });
  if (sortSel) sortSel.addEventListener('change', () => { activeSort = sortSel.value; reset(); });

  loadCategories().then(reset);
})();
