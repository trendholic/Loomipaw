/* Collection page — server-side filtering, sorting, pagination. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const $ = (s) => document.querySelector(s);
  const grid = $('[data-collection]');
  const countEl = $('[data-count]');
  const filterWrap = $('[data-filters]');
  const sortSel = $('[data-sort]');
  if (!grid) return;

  let activeFilter = 'all';
  let activeSort = 'featured';

  const params = new URLSearchParams(location.search);
  if (params.get('category')) activeFilter = params.get('category');

  async function loadCategories() {
    if (!filterWrap) return;
    try {
      const { categories } = await API.categories();
      const chips = ['<button class="filter-chip" data-filter="all">All</button>']
        .concat(categories.map((c) => `<button class="filter-chip" data-filter="${c.slug}">${Loom.escapeHtml(c.name)}</button>`));
      filterWrap.innerHTML = chips.join('');
      setActive();
    } catch (_) {}
  }
  function setActive() {
    filterWrap && filterWrap.querySelectorAll('.filter-chip').forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-filter') === activeFilter ? 'true' : 'false'));
  }

  async function apply() {
    grid.setAttribute('aria-busy', 'true');
    const qs = new URLSearchParams();
    if (activeFilter && activeFilter !== 'all') qs.set('category', activeFilter);
    qs.set('sort', activeSort);
    qs.set('limit', '48');
    try {
      const { products, pagination } = await API.products(qs.toString());
      if (!products.length) grid.innerHTML = '<div class="empty-state">No pieces in this collection yet — check back soon.</div>';
      else Loom.mountProducts(grid, products);
      if (countEl) countEl.textContent = `${pagination.total} ${pagination.total === 1 ? 'piece' : 'pieces'}`;
      Loom.syncWishButtons(); Loom.initReveal();
    } catch (e) {
      grid.innerHTML = `<div class="empty-state">Couldn’t load products. ${Loom.escapeHtml(e.message)}</div>`;
    } finally { grid.removeAttribute('aria-busy'); }
  }

  if (filterWrap) filterWrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip'); if (!chip) return;
    activeFilter = chip.getAttribute('data-filter'); setActive();
    const u = new URL(location); if (activeFilter === 'all') u.searchParams.delete('category'); else u.searchParams.set('category', activeFilter);
    history.replaceState({}, '', u); apply();
  });
  if (sortSel) sortSel.addEventListener('change', () => { activeSort = sortSel.value; apply(); });

  loadCategories().then(apply);
})();
