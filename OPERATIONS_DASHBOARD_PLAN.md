# Loomipaw — Operations Dashboard Plan

The daily operating picture. Most of this is already available in **Admin →
Analytics / Activity / Inventory** + **GA4** + your ad/ESP dashboards — this doc
defines *what to look at, from where, and the daily rhythm*. Pair with
`PROFIT_METRICS_PLAN.md` (targets) and `CUSTOMER_SUPPORT_PLAYBOOK.md`.

---

## The daily dashboard (what to track + source)

| Metric | Source (in-repo / external) | Healthy signal |
|--------|------------------------------|----------------|
| **Orders (today / 7d)** | Admin → Analytics; `GET /api/admin/analytics` | Trending up / stable |
| **Revenue (today / 7d)** | Admin → Analytics | Meets run-rate target |
| **Conversion rate** | GA4 (orders ÷ sessions) | 1.5–3% |
| **Average order value** | Admin → Analytics (`aovCents`) | $85–120+ |
| **Refunds** | Admin → Orders (refunded) / Activity `order.refund` | < 3–5% of orders |
| **Support tickets** | Contact inbox (`STORE_EMAIL`) + `contact_messages` | Cleared < 24h |
| **Inventory** | Admin → Inventory (`GET /api/admin/inventory`) | No unexpected zeros |
| **Low-stock alerts** | `GET /api/admin/alerts` (stock ≤ threshold) | Restock before zero |
| **Email revenue** | ESP dashboard + GA4 UTM | 15–25% of revenue (mature) |
| **Ad spend** | Meta / TikTok Ads Manager | Within budget; CPA ≤ target |
| **Profit (per order after CAC)** | Sheet: AOV − COGS − ship − fees − CAC | **Positive** |

**Reconcile daily:** GA4 revenue ≈ Admin order revenue. A divergence means a
tracking problem — fix before trusting ad numbers.

---

## Daily review process (~15 min, same time each day)

**Morning (start of day)**
1. **Overnight orders & revenue** — Admin → Analytics. Anything unusual (spike/
   drop, big order, many refunds)?
2. **Payments healthy?** — any failed/declined patterns; webhook errors in logs.
3. **Fulfillment queue** — Admin → Orders `pending`/`processing`: ship within
   the 1–2 day promise; add tracking.
4. **Low-stock alerts** — `GET /api/admin/alerts`: reorder/adjust before zero.
5. **Support inbox** — triage with `CUSTOMER_SUPPORT_PLAYBOOK.md`; clear < 24h.

**Midday**
6. **Ad performance** — CPA/ROAS per campaign; kill/scale per
   `PAID_AD_TESTING_PLAN.md`. No scaling before the do-not-scale gate.
7. **Site health** — `/api/health` green; error logs clean (`MONITORING.md`);
   skim a couple of Clarity recordings for new friction.

**End of day**
8. **Log the numbers** — orders, revenue, AOV, spend, CPA, refunds into a daily
   sheet (one row/day). Trends matter more than any single day.
9. **One action** — the single highest-leverage fix/experiment for tomorrow.

---

## Weekly rollup (30 min)

- Week-over-week: revenue, orders, CVR, AOV, blended ROAS, email share,
  repeat-rate, refund-rate (`PROFIT_METRICS_PLAN.md` targets).
- Inventory: sell-through, reorder decisions, slow movers.
- Support themes: top ticket topics → product/UX signals.
- Creative: winners/losers → next batch (`CONTENT_CREATIVE_SYSTEM.md`).
- Decide: scale, hold, or cut — on data.

---

## Alerting (set these up — see `MONITORING.md`)

- **Uptime:** `/api/health` + homepage + a product page.
- **Errors:** 5xx rate spike; unhandled exceptions.
- **Payments:** webhook failures; decline-rate spike.
- **Security:** login-failure spikes (audit log).
- **Ops:** disk > 80%; backup freshness; TLS expiry.
- **Inventory:** low-stock (poll `/api/admin/alerts` or dashboard).

## Suggested single-screen layout

```
┌──────────── TODAY ────────────┐  ┌──────── ALERTS ────────┐
│ Orders  Revenue  AOV  CVR     │  │ Low stock:  N variants │
│ Refunds  Ad spend  CPA  ROAS  │  │ Pending ship: N orders │
└───────────────────────────────┘  │ Open tickets: N        │
┌──────────── 7-DAY TREND ──────┐  │ Errors (24h): N        │
│ revenue · orders · CVR spark  │  └────────────────────────┘
└───────────────────────────────┘
```

Build it from Admin → Analytics + GA4 (or a Looker Studio board pulling GA4 +
a sheet). The goal is **one glance = know if today is on track**.
