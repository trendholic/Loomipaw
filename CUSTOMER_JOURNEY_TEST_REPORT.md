# Loomipaw — Customer Journey Test Report

Executed a complete shopper + admin lifecycle against the **real running app**
(in-process, ephemeral port) via `scripts/journey-sim.js` (`node
scripts/journey-sim.js`). Every step below was measured, not asserted from
memory. The same paths are also covered by the automated suite
(`server/test/flow.test.js`, now 21 tests).

**Result: 12 / 12 steps PASSED.**

---

## Passed steps (measured)

| # | Step | Result | Evidence |
|---|------|:------:|----------|
| 1 | Lands on homepage | ✅ | `GET /` → HTTP 200 |
| 2 | Views product | ✅ | `GET /api/products/aspen-merino-knit` → 200, in-stock variant found |
| 3 | Adds product to cart | ✅ | `POST /api/cart/items` → cart count 1 |
| 4 | Uses discount code | ✅ | `WELCOME10` → discount = 10% of subtotal (−$7.80 measured) |
| 5 | Uses upsell (adds complementary item) | ✅ | Heritage Leather Collar added → cart count 2 |
| 6 | Completes checkout | ✅ | `POST /api/checkout` (4242 card) → 201, order `LP-…` |
| 6b | Cart cleared after purchase | ✅ | `GET /api/cart` → count 0 |
| 7 | Receives order confirmation email | ✅ | dev transport wrote `…order-…-is-confirmed.eml` |
| 8 | Views order history | ✅ | `GET /api/orders` → order present, `financial_status: paid` |
| 9 | Requests support (contact form) | ✅ | `POST /api/contact` → 201, admin receipt email written |
| 10 | Receives shipping update | ✅ | admin ships + tracking → status `shipped`, customer email written |
| 11 | Requests refund → processed + stock restored | ✅ | admin refund → status `refunded`, stock +1 restored, refund email written |

**Also observed as side-effects (correct behavior):** welcome email on
registration, admin new-order notification on checkout, order-status email on
both ship and refund. Decline path (`4000…0002`) is separately verified in
`flow.test.js` to return 402 with the cart preserved.

## Failed steps

**None.** All 12 steps passed on execution.

## Fixes made this phase

- **Inventory history was recorded but not readable** — added
  `GET /api/admin/inventory/history` so the existing `inventory_log` (orders,
  cancels/refunds, manual + bulk adjustments) is auditable. Covered by a new
  flow test. (See `INVENTORY_MANAGEMENT_PLAN.md`.)
- **Mobile:** "Frequently bought together" rows could cramp on narrow phones —
  added a ≤560px rule so items stack full-width with a full-width add button
  (see Mobile Audit below). No other real issues found.

---

## Mobile conversion audit (Phase 5)

Reviewed every template at phone widths against the existing breakpoints.

| Area | Status | Notes |
|------|:------:|-------|
| Global | ✅ | `body { overflow-x: hidden }` guards against horizontal scroll |
| Navigation | ✅ | Hamburger → full-screen mobile nav; icons remain tappable |
| Product images | ✅ | Gallery stacks above info at ≤860px; thumbnails wrap |
| Add to cart | ✅ | Primary button full-width; **sticky add-to-cart bar** on scroll |
| Cart drawer | ✅ | Fixed-width drawer with its own scroll; progress bar renders |
| Checkout | ✅ | Two-column collapses to one at ≤860px; fields full-width |
| Collection | ✅ | Filter chips scroll horizontally; grid reflows |
| Buttons / tap targets | ✅ | ≥44px targets; `@media (hover:none)` reveals hover-only actions |
| Text readability | ✅ | Fluid `clamp()` type; body ≥15px; adequate line-height |
| Loading speed | ✅ | Deferred JS, lazy images, prioritized hero, compression, long-cache assets |
| **Frequently-bought-together** | ✅ *(fixed)* | Now stacks full-width ≤560px (was at risk of cramping) |

**Real issues found: 1 (FBT cramping) — fixed.** Everything else was already
mobile-sound.

---

## How to re-run

```bash
node scripts/journey-sim.js     # full lifecycle, prints PASS/FAIL per step
npm test                        # automated suite incl. flow.test.js
```

Re-run after any change to cart, checkout, orders, inventory, or email code.
