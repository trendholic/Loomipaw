# Loomipaw — Email Marketing Strategy

Lifecycle email is the highest-ROI channel for a store like Loomipaw: the
transactional mailer, templates, and event hooks already exist
(`server/lib/mailer/`, `EMAIL.md`), so these flows are **configuration +
copy + an ESP**, not new engineering. Connect an ESP (SendGrid/Klaviyo/
Postmark — see `EMAIL.md`), export the `newsletter` + customer lists, and
build the automations below.

> **Data you already capture:** newsletter signups (`newsletter` table),
> account emails, order history, cart contents (server-side cart), and
> analytics events (`view_item`, `add_to_cart`, `begin_checkout`,
> `purchase`). That's everything these flows need.

Benchmarks below are **industry estimates for pet/apparel DTC**, not
guarantees — treat them as planning baselines to beat.

---

## 0. Foundations

- **Sender:** `MAIL_FROM` on your domain, SPF/DKIM/DMARC aligned (`EMAIL.md`).
- **Capture:** newsletter modal/footer already offer **10% off first order** —
  keep this as the list-growth engine. Add an exit-intent and a post-add-to-cart
  capture for guests.
- **Segments:** Non-buyers · First-time buyers · Repeat buyers · Lapsed (90d+) ·
  High-AOV (>$150) · Category affinity (apparel / walking / beds).
- **Cadence guardrail:** max ~2–3 promotional sends/week; automations always on.

---

## 1. Welcome series (trigger: newsletter signup / account creation)

Goal: convert the 10%-off subscriber into a first order within 7 days.
*Estimated: 40–55% open, 3–6% of subscribers convert over the series.*

| # | Timing | Subject (test A/B) | Content |
|---|--------|--------------------|---------|
| 1 | Immediate | "Here's your 10% off 🐾" | Deliver code, set expectations, 1 hero CTA → Shop. Brand promise: designed for the bond, OEKO-TEX®, 30-day guarantee. |
| 2 | +1 day | "Why 40,000 pet parents chose Loomipaw" | Brand story (from homepage), sustainability, comfort-tested. Soft CTA → Our Story / best sellers. |
| 3 | +3 days | "The pieces everyone starts with" | **Best sellers:** Aspen Merino Knit ($78), Trailhead Adventure Harness ($64), Cloud Orthopedic Lounger ($189). Reviews inline. |
| 4 | +5 days | "Your 10% expires soon" | Urgency + reassurance (free shipping >$75, free returns). Re-state code. |

**Copy anchors:** 4.9★ / 12,000+ reviews, OEKO-TEX®, carbon-neutral shipping,
30-day happiness guarantee.

---

## 2. Abandoned cart / browse (trigger: `add_to_cart` or `begin_checkout`, no `purchase`)

Highest-revenue automation. Server-side cart means you can render exact items.
*Estimated recovery: 5–11% of abandoned carts across the 3-touch series.*

| # | Timing | Angle | Content |
|---|--------|-------|---------|
| 1 | 1 hour | Reminder | "You left something for a good dog." Show cart items + image, one-click return to `/cart.html`. No discount yet. |
| 2 | 24 hours | Benefits + social proof | Reinforce guarantee/returns, add 2–3 verified reviews for the exact item/category. |
| 3 | 48 hours | Final + gentle incentive | Free-shipping reminder (or a small code only if margin allows). Scarcity **only if truthfully low stock**. |

**Browse-abandon** (viewed product, no add): single email at +12h with the
viewed item + "still thinking it over?" + related picks.

---

## 3. Post-purchase (trigger: `purchase`)

Drives retention, reviews, and the second order — where LTV is made.

| # | Timing | Purpose | Content |
|---|--------|---------|---------|
| 1 | Immediate | Thank you / confirmation | Already sent transactionally. Add a "what happens next" + follow @loomipaw. |
| 2 | +2 days | How to use / care | Category-specific: sizing/fit for apparel, harness fitting for walking, bed break-in for beds. Reduces returns. |
| 3 | +10 days | Review request | Ask for a review (links to the on-page review form). Offer entry to a monthly giveaway, not cash-for-reviews. |
| 4 | +45 days | Replenish / complete the set | Cross-sell the natural next item (see bundle logic in `REVENUE_GROWTH_REPORT.md`): collar buyer → ID tag + bandana; bed buyer → Cashmere-Blend Throw. |

---

## 4. Win-back (trigger: no order in 90 / 150 days)

*Estimated reactivation: 3–8% of lapsed contacts.*

| # | Timing | Angle |
|---|--------|-------|
| 1 | 90 days | "We miss you (and so does your pup)" — new arrivals + best sellers. |
| 2 | 120 days | Single best incentive (15% or free shipping) with deadline. |
| 3 | 150 days | "Last goodbye" — final offer + list-hygiene sunset if no engagement. |

---

## 5. Always-on campaigns

- **New arrival** announcements to category-affinity segments.
- **Seasonal edits** (the site already teases an "Autumn Edit"): winter warmth
  (Storm Coat + Aspen Knit + Cashmere Throw), summer walks (Harness + Lead +
  Paw Protectors).
- **Back-in-stock** for sold-out variants (hook into inventory).
- **VIP / loyalty** once repeat cohort is large enough.

---

## 6. Measurement

Track per-flow: delivery, open, CTR, **revenue per recipient**, and
placed-order rate. Attribute in GA4 via UTM (`utm_source=email&utm_medium=
lifecycle&utm_campaign=welcome-3`). Target email as **20–30% of total revenue**
within 90 days of turning the flows on.

**Priority to build first:** Abandoned cart → Welcome → Post-purchase review →
Win-back. (Revenue impact, descending.)
