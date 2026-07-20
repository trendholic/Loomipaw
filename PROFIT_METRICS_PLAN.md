# Loomipaw — Profit Metrics Plan

The dashboard of truth. What to track, where it comes from, and the targets for
the first 30 and 90 days. Most of this is already available: **Admin → Analytics
& Activity Log** (revenue, orders, AOV, top products, refunds) + **GA4**
(traffic, funnel, source/medium) + **ad platforms** (spend, CPA, ROAS) + **ESP**
(email revenue). Reconcile GA4 revenue against Admin order totals weekly.

**All targets are estimates for a premium pet DTC launch — directional, not
guaranteed.** Beat them or learn why.

---

## Core metrics

| Metric | Definition | Source | 30-day target | 90-day target |
|--------|------------|--------|:-------------:|:-------------:|
| **Revenue** | Gross sales (paid orders) | Admin Analytics / GA4 | Establish baseline; positive weekly trend | 2–4× the Day-30 run-rate |
| **Orders** | Count of paid orders | Admin Analytics | 25–100 (traffic-dependent) | 150–500 |
| **Conversion rate** | Orders ÷ sessions | GA4 | 1.0–2.0% (early) | 2.0–3.0% |
| **AOV** | Revenue ÷ orders | Admin Analytics | $85–110 | $110–130 (bundles/FBT) |
| **CAC** | Ad spend ÷ new customers | Ads ÷ Admin | ≤ 50% of AOV | ≤ 35–45% of AOV |
| **ROAS (blended)** | Revenue ÷ total ad spend | Ads + GA4 | ≥ 1.5–2.0 | ≥ 2.5–3.5 |
| **Email revenue share** | Email-attributed ÷ total | ESP + GA4 UTM | 5–15% (flows ramping) | 15–25% |
| **Repeat-purchase rate** | Customers with ≥2 orders ÷ customers | Admin (customers/orders) | 5–10% | 15–25% |
| **Refund rate** | Refunded ÷ paid orders | Admin (refund flow) | < 3–5% | < 3% |

### Supporting metrics (watch, don't obsess)
- **Add-to-cart rate**, **checkout-start rate**, **checkout completion** (GA4 funnel) — locate the leak.
- **Sessions & source/medium** (GA4) — channel mix and organic growth.
- **Creative:** thumbstop, hold, CTR, CPA per asset (ad platforms).
- **Contribution margin** = AOV − COGS − shipping − payment fees − CAC. The real profit line; keep it **positive after CAC**.

---

## Weekly review cadence (30-minute standup)

1. Revenue, orders, AOV vs. last week (Admin Analytics).
2. GA4 funnel — where are visitors dropping? (CVR, add-to-cart, checkout).
3. Ad performance — CPA/ROAS per campaign; kill/scale decisions (`PAID_AD_TESTING_PLAN.md`).
4. Email — revenue per flow, open/CTR (ESP).
5. Refund rate + support themes (Admin Activity Log + Clarity recordings).
6. One experiment shipped, one learning documented.

## 30-day goals (foundation)

- [ ] Tracking reconciled: GA4 revenue == Admin order totals.
- [ ] Baseline established for every core metric above.
- [ ] ≥1 profitable ad set at/under target CPA.
- [ ] Email flows live and attributing revenue.
- [ ] Refund rate < 5%; no systemic fit/quality complaints.
- [ ] AOV lifted by bundles/FBT vs. single-item baseline.

## 90-day goals (profitable growth)

- [ ] Blended ROAS ≥ 2.5–3.5 at higher spend.
- [ ] Email 15–25% of revenue.
- [ ] Repeat-purchase rate 15–25% (post-purchase flow working).
- [ ] Non-brand organic sessions growing MoM (SEO content).
- [ ] Positive **contribution margin after CAC** — the definition of a real business.

---

## A simple profit model (fill in your real numbers)

```
Contribution per order = AOV − COGS − shipping − payment fees
Profit per order        = Contribution per order − CAC
Monthly profit          = Orders × Profit per order − fixed costs
```

Track these in a sheet weekly. **The only metric that ultimately matters is
profit per order after CAC** — everything above is a lever on it. Do not scale
spend while it is negative.
