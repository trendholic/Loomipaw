/* =====================================================================
   LOOMIPAW — Collection page (filter + sort)
   ===================================================================== */
(function () {
  "use strict";
  const LP = window.LOOMIPAW;
  const products = window.LOOMIPAW_PRODUCTS || [];
  if (!LP) return;

  const grid = document.querySelector("[data-collection]");
  const countEl = document.querySelector("[data-count]");
  const filterWrap = document.querySelector("[data-filters]");
  const sortSel = document.querySelector("[data-sort]");

  let activeFilter = "all";
  let activeSort = "featured";

  // Support deep-link ?category=Walking
  const params = new URLSearchParams(location.search);
  if (params.get("category")) {
    const c = params.get("category");
    const chip = filterWrap && filterWrap.querySelector(`[data-filter="${c}"]`);
    if (chip) { activeFilter = c; setActiveChip(chip); }
  }

  function setActiveChip(chip) {
    filterWrap.querySelectorAll(".filter-chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", "true");
  }

  function apply() {
    let list = products.filter((p) => activeFilter === "all" || p.category === activeFilter);
    switch (activeSort) {
      case "price-asc": list = list.slice().sort((a, b) => a.price - b.price); break;
      case "price-desc": list = list.slice().sort((a, b) => b.price - a.price); break;
      case "rating": list = list.slice().sort((a, b) => b.rating - a.rating); break;
      case "reviews": list = list.slice().sort((a, b) => b.reviews - a.reviews); break;
      default: list = list.slice().sort((a, b) => (b.bestSeller === true) - (a.bestSeller === true));
    }
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state">No pieces in this collection yet — check back soon.</div>';
    } else {
      LP.mountProducts(grid, list);
    }
    if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"}`;
    LP.syncWishButtons();
    LP.initReveal();
  }

  if (filterWrap) {
    filterWrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      activeFilter = chip.getAttribute("data-filter");
      setActiveChip(chip);
      apply();
    });
  }
  if (sortSel) sortSel.addEventListener("change", () => { activeSort = sortSel.value; apply(); });

  apply();
})();
