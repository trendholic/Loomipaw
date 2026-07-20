# Loomipaw — Paid Ads Testing Plan (First 30 Days)

A disciplined test-first plan. **Prerequisite:** `TRACKING_LAUNCH_CHECKLIST.md`
fully signed off — `Purchase`/`CompletePayment` verified on GA4, Meta, and
TikTok. **Do not scale before conversion data exists.**

All numbers are **planning estimates** for a premium pet DTC launch; adjust to
your cash position and actual results. Assumed AOV ~$85–120 → target CPA
≤ ~$40–50.

---

## Structure overview

| Campaign | Audience | Objective | Starts | Daily budget |
|----------|----------|-----------|--------|:-----------:|
| 1 — Cold prospecting | Broad + interests | Purchase (or AddToCart early) | Day 1 | $50–100 |
| 2 — Retargeting | Site visitors / viewers | Purchase | Day ~8 (once traffic exists) | $20–30 |
| 3 — Cart abandonment | AddToCart / InitiateCheckout non-purchasers | Purchase | Day ~8 | $15–25 |
| 4 — Lookalikes | Purchaser LAL | Purchase | Day ~15 (needs seed) | $30–50 |

Run on Meta first (best DTC prospecting economics); mirror winners to TikTok
via Spark Ads. Keep pixels optimizing to **Purchase**; only fall back to
`AddToCart` if daily conversions are too sparse to exit learning, then switch
back.

---

## Campaign 1 — Cold audience testing (Day 1+)

- **Goal:** find 1–2 winning **creative × audience** combos.
- **Ad sets (3–4):** (a) Advantage+/broad, (b) dog-owner interests, (c) luxury/
  premium-pet interests, (d) sustainability interests.
- **Ads:** 3–5 per set, **UGC video first**, plus 1 testimonial + 1 before/after
  (see `CONTENT_CREATIVE_SYSTEM.md`).
- **Budget:** $50–100/day total ($15–25/ad set).
- **Test duration:** 4–7 days (let each ad set reach ≥50 optimization events or
  ~$150 spend before judging).
- **Winning criteria:** CPA ≤ target (~$40–50) **or** ROAS ≥ 1.5–2.0 with CTR
  ≥ 1% and healthy thumbstop (3-sec view rate ≥ 25%).
- **Kill criteria:** kill an **ad** at ~$20–30 spend with 0 add-to-carts or CTR
  < 0.8%; kill an **ad set** at ~2–3× target CPA with no purchases.

## Campaign 2 — Retargeting site visitors (Day ~8+)

- **Goal:** convert warm traffic Campaign 1 generated.
- **Audiences:** `ViewContent` + all site visitors, 7–14 days, **excluding
  purchasers**.
- **Ads:** dynamic product ads (catalog) + social-proof/review creative +
  guarantee messaging.
- **Budget:** $20–30/day.
- **Duration:** ongoing once audiences reach ~1,000 users.
- **Winning criteria:** ROAS ≥ 3–5 (warm should beat cold).
- **Kill criteria:** pause if ROAS < 1.5 after ~$100 spend or frequency > 4 with
  declining returns.

## Campaign 3 — Cart abandonment (Day ~8+)

- **Goal:** recover high-intent drop-offs (works **with** the abandoned-cart
  email flow, not instead of it).
- **Audience:** `AddToCart` / `InitiateCheckout` non-purchasers, 3–14 days.
- **Ads:** dynamic cart items + urgency ("popular pieces sell out") + free
  shipping/guarantee reassurance. Discount only if margin allows.
- **Budget:** $15–25/day.
- **Winning criteria:** ROAS ≥ 4–6 (highest-intent audience).
- **Kill criteria:** pause if ROAS < 2 after ~$80 spend.

## Campaign 4 — Customer lookalikes (Day ~15+, needs seed)

- **Goal:** scale prospecting on people similar to buyers.
- **Prereq:** a purchaser seed (start at 1% LAL from purchasers; if too small,
  use AddToCart or newsletter LAL until buyer volume grows).
- **Ads:** the proven winners from Campaign 1.
- **Budget:** $30–50/day.
- **Winning criteria:** CPA ≤ target at equal/greater volume than cold.
- **Kill criteria:** same as Campaign 1.

---

## Testing rules (non-negotiable)

1. **One variable per test** — audience OR hook OR format OR offer, never several.
2. **Minimum data before deciding** — ~$20–30/ad and ~50 optimization events/ad
   set; don't judge on day 1 noise.
3. **Kill fast, scale slow** — cut $0-sale losers; raise winners **20–30% every
   2–3 days** to avoid learning resets.
4. **Creative is 70% of performance** — always have 3–5 fresh variants queued;
   watch frequency (>2.5–3 = fatigue).
5. **Document every test** — hypothesis → spend → CPA/ROAS → decision. Compounding
   learning is the real asset.

## Do-not-scale gate

Scaling (Campaign-4 expansion, budget step-ups beyond test levels) is **blocked
until**:
- [ ] ≥ 20–30 tracked purchases attributed in-platform, **and**
- [ ] GA4 revenue reconciles with real orders, **and**
- [ ] at least one ad set is **profitably** at/under target CPA for 3+ days.

Until then, the job is **learning**, not spending.

---

## Week-by-week

| Week | Focus | Spend/day | Success signal |
|------|-------|:---------:|----------------|
| 1 | Campaign 1 cold tests | $50–100 | ≥1 ad set at/under CPA; creative winners identified |
| 2 | Add Campaigns 2 & 3 (retarget + cart) | +$35–55 | Retargeting/cart ROAS ≥ 3–4 |
| 3 | Optimize; seed lookalikes | hold | Stable CPA; purchaser seed growing |
| 4 | Campaign 4 + scale winners (gated) | 1.5–2× | Blended ROAS holds while spend rises |

KPIs and targets: see `PROFIT_METRICS_PLAN.md`.
