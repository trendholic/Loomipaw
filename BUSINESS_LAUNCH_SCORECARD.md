# Loomipaw — Business Launch Scorecard

A candid readiness assessment across the six pillars of a launchable DTC
business. Scores reflect what is **built and verified in this repo** versus what
still needs **operator activation** (accounts, spend, content). Where something
depends on config not code, that's called out — it's an activation task, not a
defect.

Scoring: /10 per pillar. "Built" = implemented + tested in-repo. "Activation" =
turn-key but needs your accounts/decisions.

---

## Scores

| Pillar | Score | State |
|--------|:-----:|-------|
| **Website** | **9.5** | Built |
| **Marketing** | **7.5** | Built foundations; needs activation |
| **Analytics** | **9.0** | Built; needs IDs + verification |
| **Operations** | **9.0** | Built; needs prod config |
| **Customer support** | **7.0** | Built basics; needs staffing/content |
| **Profitability** | **6.5** | Instrumented; unproven until live traffic |
| **Overall** | **8.1 / 10** | **Launch-ready pending operator activation** |

---

### Website — 9.5
**Built:** premium responsive storefront; full catalog/cart/checkout/accounts/
orders/wishlist/search/reviews; PDP optimized (value-prop, trust, FAQ, sticky
mobile add-to-cart, FBT); cart free-ship progress + upsell; the critical dead-
checkout bug fixed; a11y + performance foundations; 36/36 tests green.
**Gap:** lifestyle video + per-SKU unique copy; Journal/Sustainability pages.

### Marketing — 7.5
**Built/prepared:** analytics + ecommerce events; SEO (server meta + Product/
FAQ/ItemList/Breadcrumb schema, sitemap, robots); **ready-to-send email
templates** (welcome ×4, abandoned ×3, post-purchase ×3) via `npm run
render:emails`; full playbooks (acquisition, paid-ads, creative-50, SEO growth,
launch plan, email strategy).
**Activation:** connect ESP + schedule flows; set pixel IDs; produce creative;
publish blog content; start paid tests.

### Analytics — 9.0
**Built:** GA4/Meta/TikTok/Clarity loaders (CSP-safe, gated by env) + canonical
`view_item/add_to_cart/begin_checkout/purchase` events mapped per vendor;
verification + launch checklists.
**Activation:** set the 4 IDs, run `TRACKING_LAUNCH_CHECKLIST.md`, mark
conversions, link Google Ads/Search Console.

### Operations — 9.0
**Built:** Docker/compose/nginx; online backup + verified restore; disaster
recovery; startup env validation (blocks unsafe prod boot); payment abstraction
(dev/Stripe/PayPal + webhooks + refunds); transactional email; admin dashboard
(inventory, orders, coupons, CSV, activity log).
**Activation:** live gateway keys + webhooks, HTTPS/TLS, SMTP + SPF/DKIM/DMARC,
off-server backups, monitoring/alerts (`FINAL_GO_LIVE_CHECKLIST.md`).

### Customer support — 7.0
**Built:** contact form (emails store + receipt), order tracking, account order
history, self-serve FAQ (PDP + shipping/returns), 30-day guarantee policy.
**Gap/activation:** staffed inbox + SLA; helpdesk (or shared inbox); size-guide
page; expanded policy/FAQ pages; live-chat optional. Person-dependent, not code.

### Profitability — 6.5
**Instrumented:** AOV levers live (bundles/FBT/free-ship/upsell); refund
tracking; profit-metrics plan with 30/90-day targets.
**Unproven:** margins, CAC, ROAS require **real traffic + spend** — cannot be
asserted pre-launch. This score rises fastest once data exists and the
do-not-scale gate is cleared.

---

## Biggest risks

1. **Launching paid before tracking is verified.** Mitigation: hard gate in
   `TRACKING_LAUNCH_CHECKLIST.md` + `PAID_AD_TESTING_PLAN.md` — no scale until
   `purchase` reconciles with orders.
2. **Unproven unit economics.** Margins/CAC unknown until live; scaling a
   negative contribution-after-CAC burns cash. Mitigation: profit model +
   weekly review; scale only what's profitable.
3. **Creative supply.** Paid perf is ~70% creative; without a steady pipeline,
   ad accounts fatigue. Mitigation: `CONTENT_CREATIVE_SYSTEM.md` batch workflow.
4. **Support capacity at volume.** Returns/sizing questions spike with scale.
   Mitigation: staff the inbox, ship the size-guide page, lean on FAQ.
5. **Operational go-live items** (TLS, live payments, off-box backups, alerts)
   not yet configured — checklist-gated, low effort, high consequence if skipped.

## Highest-ROI actions (do in this order)

1. **Complete `FINAL_GO_LIVE_CHECKLIST.md`** (payments, HTTPS, email, backups) — unblocks everything.
2. **Activate + verify analytics** (`TRACKING_LAUNCH_CHECKLIST.md`) — you cannot optimize blind.
3. **Turn on email flows** (templates are ready) — abandoned-cart first, highest ROI.
4. **Ship 8–12 creatives** (`CONTENT_CREATIVE_SYSTEM.md`) and start **cold tests** ($50–100/day).
5. **Layer retargeting + cart-abandonment ads** once traffic exists.
6. **Scale only after** the do-not-scale gate clears (verified purchases +
   profitable ad set).

---

## Verdict

**Overall 8.1/10 — the product is launch-ready; the remaining work is operator
activation, not engineering.** The store converts, tracks, and upsells; the
growth playbooks and email templates are prepared. Execute the go-live checklist,
verify tracking, turn on email, and start disciplined paid tests — then let the
`purchase` data decide what to scale.
