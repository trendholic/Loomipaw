# Loomipaw — Business Launch Scorecard

Readiness across the six pillars of a launchable DTC business, updated after the
**Final Pre-Launch Operations** phase (full journey simulation, support system,
ops dashboard, inventory audit, mobile audit, launch runbook).

**Key distinction (Phase 7 requirement):** we separate **Code readiness** (what
is built, tested, and verified in this repo) from **Business readiness** (what
still needs operator activation — accounts, spend, staffing, content, go-live
config). The software is essentially done; the remaining work is running the
business.

---

## Scores (updated)

| Pillar | Prev | **Now** | Code readiness | Business readiness |
|--------|:----:|:-------:|:--------------:|:------------------:|
| **Website** | 9.5 | **9.5** | 9.6 (mobile FBT fix, journey-verified) | 9.0 (needs lifestyle video, Journal page) |
| **Marketing** | 7.5 | **7.5** | 9.0 (analytics + SEO + email templates built) | 6.5 (ESP + pixels + creative + spend to activate) |
| **Analytics** | 9.0 | **9.0** | 9.5 (events implemented + tested) | 8.0 (set IDs + verify live) |
| **Operations** | 9.0 | **9.5** | 9.7 (inventory history closed; 39 tests; 12/12 journey) | 8.5 (prod config + daily process) |
| **Support** | 7.0 | **8.0** | 8.5 (contact/track/history + 8 response templates) | 7.0 (staff the inbox + SLA) |
| **Profitability** | 6.5 | **6.5** | n/a (instrumented) | 6.5 (unproven until live traffic) |
| **Overall** | 8.1 | **8.3 / 10** | **≈ 9.4 / 10** | **≈ 7.5 / 10** |

> **Read this as:** the product is **~9.4/10 built and verified**; the business
> is **~7.5/10 ready** pending operator activation. Nothing below is blocked on
> more engineering.

---

## What moved this phase

- **Operations 9.0 → 9.5:** full 12/12 customer-journey simulation passed
  (`CUSTOMER_JOURNEY_TEST_REPORT.md`); **inventory history** made readable
  (`GET /api/admin/inventory/history`) closing the one real gap; daily ops
  process + launch runbook documented; test suite now 39 green.
- **Support 7.0 → 8.0:** `CUSTOMER_SUPPORT_PLAYBOOK.md` — 8 common-question
  response templates + escalation + metrics. (Still needs a staffed inbox → not
  a code item.)
- **Website:** mobile audit found + fixed one real issue (FBT cramping ≤560px);
  everything else already mobile-sound.

---

### Website — 9.5  (code 9.6 / business 9.0)
**Built & verified:** premium storefront; full commerce; PDP optimized
(value-prop, trust, FAQ+schema, sticky mobile CTA, FBT); cart progress + upsell;
critical checkout bug fixed; **12/12 journey passed**; mobile audited. 39 tests
green. **Business gap:** lifestyle video, per-SKU copy, Journal/Sustainability
pages.

### Marketing — 7.5  (code 9.0 / business 6.5)
**Built:** analytics + events, SEO (server meta + Product/FAQ/ItemList/Breadcrumb
schema, sitemap, robots), **ready-to-send email templates** (10 flows,
`npm run render:emails`), full playbooks (acquisition, paid-ads, creative-50,
SEO, launch, email). **Activation:** ESP + pixels + creative production + paid
tests.

### Analytics — 9.0  (code 9.5 / business 8.0)
**Built:** GA4/Meta/TikTok/Clarity loaders (CSP-safe, env-gated) + canonical
ecommerce events, tested. **Activation:** set 4 IDs, run
`TRACKING_LAUNCH_CHECKLIST.md`, mark conversions.

### Operations — 9.5  (code 9.7 / business 8.5)
**Built & verified:** Docker/compose/nginx; backup + verified restore; env
validation; payments (dev/Stripe/PayPal + webhooks + refunds); admin
(inventory + **history**, orders, coupons, CSV, activity log); daily dashboard
plan + launch runbook. **Activation:** live gateway/HTTPS/SMTP/backups/alerts
(`FINAL_GO_LIVE_CHECKLIST.md`), run the daily process.

### Support — 8.0  (code 8.5 / business 7.0)
**Built:** contact form + receipt, order tracking, account history, PDP FAQ,
30-day guarantee, **8 branded response templates + escalation**. **Activation:**
staffed inbox, SLA, helpdesk/macros, size-guide page.

### Profitability — 6.5  (instrumented; unproven)
**Instrumented:** AOV levers live (bundles/FBT/free-ship/upsell); refund
tracking; profit model + 30/90-day targets. **Unproven:** margins/CAC/ROAS need
real traffic + spend — cannot be asserted pre-launch. Rises fastest once data
exists and the do-not-scale gate clears.

---

## Biggest risks

1. **Launching paid before tracking is verified** → gated in
   `TRACKING_LAUNCH_CHECKLIST.md` + `PAID_AD_TESTING_PLAN.md`.
2. **Unproven unit economics** → weekly profit-after-CAC review; scale only what's
   profitable.
3. **Support capacity at volume** → staff the inbox now; templates + FAQ reduce load.
4. **Creative supply for ads** → batch pipeline in `CONTENT_CREATIVE_SYSTEM.md`.
5. **Un-configured go-live items** (TLS, live payments, off-box backups, alerts)
   → checklist-gated, low effort, high consequence.

## Highest-ROI actions (in order)

1. **Complete `FINAL_GO_LIVE_CHECKLIST.md`** (payments, HTTPS, email, backups).
2. **Activate + verify analytics** (`TRACKING_LAUNCH_CHECKLIST.md`).
3. **Turn on email flows** — abandoned-cart first (templates ready).
4. **Staff support** with the playbook; publish a size-guide page.
5. **Ship 8–12 creatives** and start **cold ad tests** ($50–100/day).
6. **Follow `LAUNCH_DAY_RUNBOOK.md`** on the day; optimize on real data.
7. **Scale only after** the do-not-scale gate clears.

---

## Verdict

**Overall 8.3/10 — Code ≈ 9.4, Business ≈ 7.5.** The platform is built, tested,
and journey-verified end-to-end; the remaining work is **operational
activation**, not engineering. Execute the go-live checklist, verify tracking,
turn on email, staff support, and start disciplined paid tests — then let the
`purchase` data decide what to scale.
