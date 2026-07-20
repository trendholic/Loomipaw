/* Search page. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const form = document.querySelector('[data-search-form]');
  const results = document.querySelector('[data-search-results]');
  const count = document.querySelector('[data-search-count]');
  if (!form) return;
  const input = form.querySelector('input');

  const q0 = new URLSearchParams(location.search).get('q');
  if (q0) { input.value = q0; }
  document.addEventListener('loom:ready', () => { if (q0) run(q0); });

  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => run(input.value.trim()), 300); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value.trim()); });

  async function run(q) {
    const u = new URL(location); if (q) u.searchParams.set('q', q); else u.searchParams.delete('q'); history.replaceState({}, '', u);
    if (!q) { results.innerHTML = ''; count.textContent = ''; return; }
    count.textContent = 'Searching…';
    try {
      const { results: r } = await API.search(q);
      count.textContent = `${r.length} ${r.length === 1 ? 'result' : 'results'} for “${q}”`;
      if (!r.length) { results.innerHTML = '<div class="empty-state">No matches. Try a different search.</div>'; return; }
      Loom.mountProducts(results, r); Loom.syncWishButtons(); Loom.initReveal();
    } catch (e) { count.textContent = e.message; }
  }
})();
