# Loomipaw — Ad Scaling Rulebook

The discipline that separates profitable growth from burning cash. Scaling ad
spend **amplifies** whatever the funnel already does — so you never scale until
the funnel is proven profitable on real `purchase` data. This rulebook defines
the gates, budgets, and stop rules. Pairs with `PAID_AD_TESTING_PLAN.md`.

All figures are **planning estimates** for premium pet DTC (AOV ~$85–120).
Replace with your measured numbers as they land.

---

## The four hard gates — do NOT scale unless ALL are true

1. **Tracking verified.** `purchase`/`Purchase`/`CompletePayment` fire on
   GA4 + Meta + TikTok, values match order totals, and GA4 revenue reconciles
   with Admin orders (`TRACKING_LAUNCH_CHECKLIST.md`). *No trustworthy data → no
   scaling. Non-negotiable.*
2. **Minimum purchase data collected.** At least **~20–30 tracked purchases** on
   the ad account (per ad set you intend to scale, ideally ≥ 50 conversions to
   exit learning). Small samples lie.
3. **CAC below margin.** CAC < contribution margin per order
   (AOV − COGS − shipping − fees). If a sale doesn't profit after ad cost,
   scaling multiplies losses.
4. **ROAS target achieved.** The ad set holds **ROAS ≥ target** (start ≥ 2.0
   blended; retargeting ≥ 3–5) **for 3+ consecutive days**, not a one-day spike.

> If any gate is unmet, you are still **testing**, not scaling. Keep budgets at
> test levels.

---

## Testing budget (pre-scale)

| Stage | Daily budget | Purpose |
|-------|:------------:|---------|
| Cold prospecting tests | $50–100 | find winning creative × audience |
| Retargeting | $20–30 | convert warm traffic |
| Cart abandonment | $15–25 | recover high-intent drop-offs |
| Lookalikes (after seed) | $30–50 | scale on buyer-similar audiences |

**Total testing phase:** ~$1,500–3,000 over 30 days, front-loaded. Treat it as
**tuition** for data, not a growth expectation.

---

## Winning metrics (what "good" looks like)

| Metric | Winning threshold |
|--------|-------------------|
| **CPA** | ≤ 40–50% of AOV (tighten to ≤ 35% as you optimize) |
| **ROAS (cold)** | ≥ 1.5–2.0 (prospecting) |
| **ROAS (retarget/cart)** | ≥ 3–6 |
| **CTR (link)** | ≥ 1% |
| **Thumbstop (3-sec view)** | ≥ 25% |
| **Frequency** | < 2.5–3 (above = fatigue) |

A "winner" = meets CPA/ROAS **with enough conversions** (gate 2) over **3+ days**.

---

## Scaling method (once gates pass)

- **Vertical:** raise the winning ad set's budget **20–30% every 2–3 days**.
  Bigger jumps reset learning. Patience compounds.
- **Horizontal:** duplicate winners into new audiences (lookalikes, new
  interests, new placements); expand creative (5–10 fresh variants).
- **Re-check gates continuously** — scaling often lifts CPA; if it crosses margin,
  pull back to the last profitable budget.

---

## Stop / kill rules

**Kill an AD when:**
- ~$20–30 spend with **0 add-to-carts**, or CTR < 0.8%.

**Kill/pause an AD SET when:**
- ~2–3× target CPA with no purchases, or
- ROAS < 1.5 after ~$100 spend, or
- frequency > 3 with declining returns.

**Pull back SCALING when:**
- CPA rises above contribution margin at the higher budget → revert to the last
  profitable level, hold, gather data.

**Pause ALL scaling when:**
- Tracking breaks/diverges from orders (fix first), inventory can't support
  demand (don't oversell hero SKUs), or margin turns negative after CAC.

---

## The one-line rule

> **Never scale a loss.** Test cheaply, verify the data, prove profit per order
> after CAC, then raise budgets slowly on winners — and re-check the gates every
> step. Growth that isn't profitable isn't growth; it's a countdown.
