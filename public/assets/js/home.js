/* Homepage — load best sellers + dynamic collection cards from the API. */
(function () {
  'use strict';
  const API = window.LoomAPI;

  document.addEventListener('loom:ready', async () => {
    // Best sellers
    const grid = document.querySelector('[data-products]');
    if (grid) {
      try {
        const { products } = await API.products('bestSeller=true&limit=8');
        window.Loom.mountProducts(grid, products.length ? products : (await API.products('limit=8')).products);
        window.Loom.syncWishButtons();
        window.Loom.initReveal();
      } catch (_) { grid.innerHTML = '<p class="empty-state">Unable to load products right now.</p>'; }
    }
  });
})();
