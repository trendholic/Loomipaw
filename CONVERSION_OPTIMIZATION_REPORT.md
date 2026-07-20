# Loomipaw — Conversion Optimization Report

A full-funnel CRO, trust, SEO, and revenue audit of the live storefront,
reviewed page-by-page as a customer would experience it. Every **Critical**
and **High** impact item was implemented in this pass; **Medium/Low** items
are listed with rationale as the prioritized backlog.

- **Architecture:** unchanged (vanilla HTML/CSS/JS + Express/SQLite). No rebuilds.
- **Backend changes:** only where required for the analytics requirement (a real
  gap), plus one genuine bug fix. No speculative refactors.
- **Verification:** `npm test` → **36/36 pass**; `npm run coverage:check` →
  **PASS** (82.3% lines/statements, 83.6% functions); CSP + settings + collection
  SEO injection verified against a live in-process server.

Impact ratings: **Critical** = directly blocks/loses revenue · **High** =
large measurable lift · **Medium** = meaningful polish · **Low** = marginal.

---

## Executive summary — what shipped

| # | Change | Rating | Expected impact |
|---|--------|--------|-----------------|
| 1 | Fixed dead "Secure Checkout" button in the cart **drawer** (home/PDP/collection) | **Critical** | Recovers checkout entry for the primary add-to-cart path |
| 2 | Analytics stack: GA4, Meta Pixel, TikTok Pixel, Microsoft Clarity + full ecommerce events | **High** | Enables measurement, retargeting, and ad optimization (no data today) |
| 3 | Collection-page server-side SEO (title/desc/canonical + ItemList & Breadcrumb JSON-LD) + visible category intros | **High** | Category pages become indexable/rankable; richer SERP |
| 4 | Free-shipping **progress bar** in cart drawer + cart page | **High** | Lifts average order value toward the $75 threshold |
| 5 | Trust/security reassurance row at checkout + on cart | **High** | Reduces checkout anxiety/abandonment |
| 6 | Checkout set to `noindex`; customer-service footer links de-orphaned | **Medium** | SEO hygiene + fewer dead ends |

---

## 1. Homepage

**Findings.** Strong first impression: LCP hero uses `fetchpriority="high"`,
serif/sans type system, reveal animations respect `prefers-reduced-motion`,
lazy-loaded below-the-fold imagery, marquee trust cues, social proof, and a
newsletter capture with a first-order incentive. Skip-link, semantic landmarks,
and `aria-current` nav are already in place.

- **Dead cart-drawer checkout — CRITICAL (fixed).** The inline cart drawer's
  primary CTA linked to `href="#"`. Because "Add to Cart" auto-opens this
  drawer, the most common path to purchase led nowhere.
  - *Before:* `<a class="btn btn--block" href="#">Secure Checkout</a>`
  - *After:* `<a class="btn btn--block" href="/cart.html">View Cart &amp; Checkout</a>`
    (now consistent with the shared partial drawer used on other pages).
  - *Impact:* restores the single highest-value conversion path.
- **Orphaned footer service links — MEDIUM (fixed).** Contact / Shipping &
  Returns / Track Order / FAQ / Sizing Guide pointed to `#`. Repointed to the
  real `/contact.html` and `/account/track.html`.
- **Backlog (Low):** `Store` JSON-LD carries a self-declared `aggregateRating`;
  Google may ignore or flag organization-level ratings — consider moving rating
  proof to product schema only. Brand-narrative links (Sustainability/Journal/
  Careers/Press) have no destination yet — build or remove pre-scale.

## 2. Collection pages

**Findings.** Server-side category filtering, 5-way sorting, infinite scroll,
and quick-add already work well and are keyboard/`aria-pressed` accessible.

- **No per-category SEO — HIGH (fixed).** All category URLs rendered the same
  generic `<title>`/description and no structured data. Added a
  `collectionMeta` middleware (mirrors the product one) that injects a
  category-aware `<title>`, meta description (from the category's own copy),
  `canonical`, Open Graph, **ItemList** JSON-LD (top 12 products) and
  **BreadcrumbList** — all crawler-visible without JS. The visible hero
  headline/description + document title now also reflect the active category
  client-side.
  - *Impact:* `?category=…` pages become independently indexable and
    eligible for richer results; internal linking to products improves crawl.
- **Backlog (Medium):** category chips are hard-coded in the static HTML before
  the API overwrites them — pre-render the real set to avoid a flash.

## 3. Product pages

**Findings — already strong.** Gallery + thumbnails, variant/colour/size
selection with per-variant stock and auto-jump to an in-stock option, quantity
stepper, low-stock urgency ("Only N left"), sticky add-to-cart bar, wishlist,
compare, native share, USP reassurance block (free shipping / 30-day guarantee /
OEKO-TEX®), an accordion (Details / Sizing / Shipping & Returns), verified
reviews with rating distribution and a write-review form, related products, and
recently-viewed. Server-rendered `Product` + `Breadcrumb` JSON-LD and per-product
meta already exist for crawlers.

- **`view_item` tracking — HIGH (fixed):** now fires to GA4/Meta/TikTok on load.
- **Backlog (Medium):** the Sizing accordion could be promoted to a `FAQPage`
  JSON-LD block for FAQ rich results; add a true size-guide page/modal (today a
  toast). **Low:** product videos are not part of the catalog model — a future
  enhancement, not a gap in the current design.

## 4. Cart

**Findings.** Server-backed drawer + full cart page, line editing, coupon apply/
remove with clear errors, live subtotal, and max-qty guards.

- **Free-shipping progress bar — HIGH (fixed).** The remaining-for-free amount
  was plain text. Added a visual progress meter (drawer + cart page) that fills
  toward the $75 threshold and flips to an "unlocked" state.
  - *Impact:* a well-established AOV lever — nudges basket size upward.
- **Trust at cart — HIGH (fixed):** added an SSL/returns reassurance row.
- **Backlog (Medium):** add a cart cross-sell ("Complete the set") strip to lift
  units-per-order; persist coupon hints ("You have 10% off — apply at checkout").

## 5. Checkout

**Findings.** Single-page checkout, prefilled from the account, shipping-method
selector with live re-pricing, dev/live payment abstraction, inline validation
that scrolls to errors, and a non-replayable submit.

- **Trust reassurance — HIGH (fixed).** Added an SSL-encrypted / 30-day
  guarantee / free-shipping row directly under the pay button to reduce
  last-step anxiety.
- **`begin_checkout` tracking — HIGH (fixed).**
- **`noindex` — MEDIUM (fixed):** checkout previously said `index,follow`;
  now `noindex,follow` (and already `Disallow`ed in robots.txt).
- **Backlog (Medium):** show accepted-card marks inline; add an express-pay
  button once a live gateway (Stripe/PayPal) is activated.

## 6. SEO

**Strong already:** server-rendered product meta + JSON-LD, dynamic
`sitemap.xml` (with image entries) and `robots.txt`, canonicals, OG/Twitter,
descriptive alt text, semantic headings.

- **Fixed this pass:** collection meta + ItemList/Breadcrumb schema (§2);
  checkout `noindex`; de-orphaned internal links.
- **Search Console (High, config):** verify via the **Google Analytics method**
  (GA4 now installable) or a **DNS TXT** record — no code/meta change needed.
  Submit `/sitemap.xml`.
- **Backlog (Medium):** homepage `Organization`/`WebSite` + Sitelinks SearchBox
  schema; FAQ schema on PDP; blog/journal for content SEO.
- **Core Web Vitals:** architecture is favorable (no framework/build, deferred
  JS, prioritized hero, lazy images, compression, long-cache static assets).
  *Measure with field data (CrUX/PageSpeed) post-deploy — not asserted here.*

## 7. Performance

**Findings.** `compression` on, ETags, immutable long-cache for hashed assets
and uploads, deferred scripts, responsive WebP, lazy loading, `IntersectionObserver`
reveals. Analytics scripts are all loaded **async** and only when configured, so
they add zero weight to a store that hasn't enabled them.

- **Backlog (Low):** self-host or `preload` the two web fonts to remove the
  Google Fonts round-trip; add width/height (or `aspect-ratio`) on gallery
  images to further stabilize CLS.

## 8. Accessibility

**Findings.** Skip links, semantic landmarks, `aria-*` on interactive controls,
visible focus, `aria-live` regions (cart count, results, toasts), reduced-motion
support, form `aria-invalid` reflection, keyboard-activatable wishlist. New
progress bars expose `role="progressbar"` with `aria-valuenow`.

- **Backlog (Medium):** run an automated axe pass + manual screen-reader sweep
  and verify text contrast on taupe-on-cream secondary text against WCAG AA.
  *Contrast not asserted without measurement.*

## 9. Analytics — now installable (HIGH, implemented)

The store had **no** analytics or ad-attribution. Added a provider-agnostic,
CSP-safe stack driven entirely by env vars — set an ID to enable a vendor, leave
it blank to install nothing:

| Tool | Env var | Notes |
|------|---------|-------|
| Google Analytics 4 | `GA4_MEASUREMENT_ID` | auto page_view + ecommerce events |
| Meta Pixel | `META_PIXEL_ID` | PageView + standard events |
| TikTok Pixel | `TIKTOK_PIXEL_ID` | Pageview + events |
| Microsoft Clarity | `CLARITY_PROJECT_ID` | heatmaps + session replay |
| Google Search Console | — | verify via GA or DNS TXT (no code) |

- **Ecommerce events wired:** `view_item` (PDP), `add_to_cart` (any add),
  `begin_checkout` (checkout load), `purchase` (order confirmation, de-duped per
  order). `Loom.track()` maps each to the correct GA4 / Meta / TikTok event name
  and payload.
- **Security preserved:** vendor snippets are implemented programmatically (no
  inline `<script>`), and `server/app.js` adds each vendor's hosts to the CSP
  **only when its ID is configured** — an unconfigured store keeps a strict
  `script-src 'self'`. Verified live: no IDs → `script-src 'self'`; GA+Meta+
  Clarity set → exactly those hosts allowed, TikTok correctly absent.
- **Implementation:** `public/assets/js/analytics.js` (loader) + `Loom.track`
  in `main.js`; `config.analytics` + `/api/settings` exposure; conditional CSP.

## 10. Marketing / brand

**Findings — consistent and premium.** Cohesive voice ("crafted for the bond"),
benefit-led copy, quantified social proof (4.9★, 40k+ homes), verified-review
badges, first-order incentive, before/after storytelling. CTA verbs are active
("Shop Collection", "Discover", "View Cart & Checkout").

- **Backlog (Low):** align the homepage's `Store` review count (12,480) with the
  marquee's "40,000+" to avoid a credibility mismatch; add real social profile
  URLs (footer icons currently `#`).

## 11. Revenue optimization

| Lever | Status | Recommendation |
|-------|--------|----------------|
| **Conversion rate** | Critical drawer fix + checkout trust shipped | Add express-pay after gateway go-live; A/B the PDP CTA |
| **AOV** | Free-ship progress bar shipped | Add cart cross-sell + threshold-based gift/bundle |
| **Repeat purchase** | Accounts/orders/wishlist exist | Post-purchase email flow + first-repeat coupon (email infra already built) |
| **LTV** | Newsletter capture live | Segmented lifecycle email + loyalty/referral once traffic warrants |

---

## Prioritized backlog (not yet implemented)

**High**
- Google Search Console verification + sitemap submission (config-only).
- Cart cross-sell / bundle module (AOV).

**Medium**
- FAQ `FAQPage` schema on PDP; dedicated size-guide page/modal.
- Homepage `Organization`/`WebSite` + SearchBox schema.
- Post-purchase & win-back email flows.
- axe + screen-reader a11y sweep; WCAG AA contrast verification.
- Pre-render real category chips on collection to avoid overwrite flash.

**Low**
- Self-host/preload fonts; image dimensions for CLS.
- Reconcile review-count numbers; real social URLs; build or remove
  Sustainability/Journal/Careers/Press.

---

## Verification (measured)

- `npm test` → **36/36 pass**.
- `npm run coverage:check` → **PASS** — 82.3% statements/lines, 83.6% functions,
  61.6% branches (above enforced thresholds).
- Live in-process checks: `/api/settings` exposes `analytics`; CSP stays
  `'self'` with no IDs and opens for **exactly** the configured vendors;
  `/collection.html` returns injected `ItemList` JSON-LD + canonical.
- All modified frontend JS passes `node --check`.

*Field metrics (Lighthouse/CrUX, real conversion lift) require production
traffic and are intentionally **not** asserted here.*
