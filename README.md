# Loomipaw — Premium Pet Lifestyle

> _Designed for the bond between you and your best friend._

Loomipaw is a luxury pet lifestyle storefront experience — the Apple/Nike feeling applied
to premium dog essentials. It pairs cinematic photography, editorial typography and warm,
earthy art direction with a fast, accessible, conversion-optimized shopping flow.

Built as **clean, dependency-free HTML / CSS / vanilla JS** — no build step, no frameworks,
instantly deployable to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

---

## ✦ Experience

**`index.html` — Homepage**
1. Cinematic full-screen hero with parallax + fade-in
2. Trust bar (marquee) + luxury trust badges
3. Featured collections — editorial asymmetric grid with image-zoom hover
4. Best sellers — product cards with quick-add, wishlist, ratings, colour swatches
5. Emotional brand story with animated stats
6. Before / After drag-to-reveal lifestyle comparison
7. Customer love — UGC review gallery
8. Community `#LoomipawFamily` Instagram-style grid
9. Newsletter capture with inline success state

**`collection.html` — Shop**
- Live category filtering + sorting (price, rating, reviews), result count, deep-linkable
  via `?category=Walking`

**`product.html` — Product detail** (`?id=<product-id>`)
- Gallery with thumbnails, colour/size variant selectors, quantity stepper
- **Sticky add-to-cart bar**, USPs, expandable details accordions
- Review distribution + verified reviews
- Product recommendations & **recently viewed** (localStorage)

**Global**
- Slide-out cart drawer with free-shipping progress, quantity editing, persistence
- Wishlist with header badge, persisted across pages
- Toast notifications, mobile app-style navigation

---

## ✦ Design system

| Token | Value |
|-------|-------|
| Cream / beige backgrounds | `#FAF6EF` · `#F4EDE1` · `#EBE1D2` |
| Earth accents | Clay `#A9764F` · Espresso `#4B3B2C` |
| Luxury black | `#1B1915` |
| Metallic | Gold `#C6A15B` |
| Display type | **Fraunces** (fashion serif) |
| Body type | **Inter** (modern sans) |

Motion is intentional and subtle: scroll-reveal, hover zoom, micro-interactions — all
disabled automatically under `prefers-reduced-motion`.

---

## ✦ Engineering notes

- **Performance** — self-hosted WebP imagery, `loading="lazy"`, `fetchpriority` on hero,
  fluid `clamp()` type, zero runtime dependencies.
- **SEO** — semantic landmarks, meta + Open Graph tags, JSON-LD `Store` schema, descriptive alt text.
- **Accessibility** — skip link, keyboard-operable controls, ARIA state on toggles,
  focus-visible styling, `aria-live` regions, WCAG-minded contrast.
- **Responsive** — mobile-first, tested from 390px to widescreen; touch-friendly targets.

Photography in `assets/img/` is original, generated art direction — the brand owns its
imagery rather than hotlinking a third-party CDN.

---

## ✦ Run locally

No build required. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## ✦ Structure

```
├── index.html            # Homepage
├── collection.html       # Shop / collection with filtering
├── product.html          # Product detail
└── assets/
    ├── css/style.css      # Design system + all components
    ├── js/
    │   ├── products.js    # Product catalogue (data)
    │   ├── main.js        # Cart, wishlist, reveal, nav, before/after
    │   ├── collection.js  # Filtering + sorting
    │   └── product.js     # PDP: variants, sticky bar, recs, recently viewed
    └── img/               # Original WebP brand photography
```
