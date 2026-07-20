# Loomipaw — Conversion Optimization Operating System

The cadence for turning raw traffic into a compounding, data-driven business.
Daily you watch the funnel, weekly you learn from customers, monthly you judge
the economics. Sources are already in place: **GA4** (traffic/funnel),
**Admin → Analytics / Activity / Inventory** (orders/revenue/AOV/refunds),
**Clarity** (qualitative), **ESP + Ads** (email/spend). Targets live in
`PROFIT_METRICS_PLAN.md`.

**Rule:** measure before you optimize; change **one thing at a time**; keep a
log of every experiment (hypothesis → result → decision).

---

## DAILY — the funnel (5–10 min)

Pull from GA4 + Admin Analytics:

| Metric | Definition | Source | Watch for |
|--------|------------|--------|-----------|
| **Visitors** | sessions | GA4 | traffic source mix |
| **Add-to-cart rate** | add_to_cart ÷ sessions | GA4 | PDP / price / trust issues |
| **Checkout rate** | begin_checkout ÷ add_to_cart | GA4 | cart friction / shipping cost shock |
| **Conversion rate** | purchase ÷ sessions | GA4 | overall funnel health |
| **Revenue** | paid orders | Admin Analytics | vs. run-rate target |

**Daily habit:** find the **single biggest drop** in
`view_item → add_to_cart → begin_checkout → purchase`. That's tomorrow's fix.
Cross-check the "why" in 2–3 Clarity recordings.

---

## WEEKLY — the customer (30 min)

| Signal | Source | Action |
|--------|--------|--------|
| **Best products** | Admin Analytics top products / GA4 items | feature, bundle, stock buffer, ad creative |
| **Worst products** | same (low views/CVR) | fix copy/images, re-merchandise, or retire |
| **Customer objections** | support inbox + Clarity + community | answer on-site (FAQ/size guide/PDP copy) |
| **Refund reasons** | Admin orders + refund notes | fix root cause (sizing? quality? expectations?) |
| **Support questions** | contact inbox themes | new FAQ/macro; product/UX signal |

**Weekly habit:** ship **one** conversion experiment (PDP, cart, or checkout)
and **one** content/creative iteration. Record both.

---

## MONTHLY — the economics (60 min)

| Metric | Definition | Source | Target (see PROFIT_METRICS_PLAN) |
|--------|------------|--------|----------------------------------|
| **CAC** | ad spend ÷ new customers | Ads ÷ Admin | ≤ 35–50% of AOV |
| **ROAS** | revenue ÷ ad spend | Ads + GA4 | ≥ 2.5–3.5 (by 90d) |
| **Repeat purchase rate** | ≥2-order customers ÷ customers | Admin | 15–25% (90d) |
| **Profit** | AOV − COGS − ship − fees − CAC | sheet | **positive after CAC** |

**Monthly habit:** decide **scale / hold / cut** per channel on the data
(`AD_SCALING_RULEBOOK.md`); update baselines; set next month's one big bet.

---

## The optimization loop

```
MEASURE (daily funnel)  →  DIAGNOSE (biggest drop + Clarity why)
   →  HYPOTHESIZE (one change)  →  TEST (one variable, enough data)
   →  DECIDE (keep/kill/scale)  →  LOG  →  repeat
```

## Priority order when CVR is low (fix in this sequence)

1. **Tracking** — is the data even right? (reconcile GA4 vs orders).
2. **Checkout** — highest-intent drop; friction/trust/shipping cost.
3. **Cart** — free-ship progress working? upsell not distracting?
4. **PDP** — clarity, price justification, trust, FAQ, images.
5. **Traffic quality** — wrong audience converts poorly regardless of the page.
6. **Offer** — bundle/price/free-ship threshold tuning.

## Experiment log (keep this)

| Date | Area | Hypothesis | Change | Metric | Result | Decision |
|------|------|-----------|--------|--------|--------|----------|
| | | | | | | |

Compounding learning is the real moat. One good experiment a week = ~50/year.
