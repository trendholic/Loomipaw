# Loomipaw — Customer Feedback System

Feedback is the cheapest growth input you have: it improves products, sharpens
copy, raises conversion, and compounds into reviews/UGC that lower CAC. This
system captures it systematically and routes it to action. Uses what's already
built (on-site reviews, contact form, post-purchase email flow, Clarity) — no
new platform required.

---

## After purchase — the sequence

Driven by the post-purchase email flow (`EMAIL_MARKETING_STRATEGY.md`,
`marketingTemplates.js`) + the on-site review form.

| Touch | Timing | Purpose | Channel |
|-------|--------|---------|---------|
| Thank-you | immediate | set expectations, build goodwill | post-purchase email #1 |
| Usage / care | +2 days | reduce returns, increase satisfaction | post-purchase email #2 |
| **Review request** | ~10 days (≈ post-delivery) | social proof + product signal | post-purchase email #3 → on-site review form |
| **Customer survey** | +14 days | motivations + friction, NPS | 3–5 question form (link in email) |
| Product feedback | ongoing | quality/fit issues | contact form + review text |

**Review timing rule:** ask a few days **after delivery**, not after purchase —
they need to have used it. For the first cohort, a personal "how's {dog_name}
liking it?" note outperforms automation.

### Micro-survey (keep it to 3–5 questions)
1. How likely are you to recommend Loomipaw? (0–10 — **NPS**)
2. What almost stopped you from buying? (**objection mining**)
3. How's the fit/quality vs. expectations? (**product signal**)
4. What should we make next? (**roadmap/demand**)
5. (optional) Can we share your photo/quote? (**UGC rights**)

---

## What to analyze (and where it comes from)

| Insight | Source | Feeds into |
|---------|--------|-----------|
| **Common complaints** | reviews (≤3★), refund reasons, support tickets, Clarity rage-clicks | product/QC, PDP copy, sizing |
| **Feature/product requests** | survey Q4, reviews, DMs | roadmap, bundles, new SKUs |
| **Purchase motivations** | survey Q2/Q3, review language | ad angles + PDP copy (use their words) |
| **Sizing/fit issues** | returns + support "sizing" volume | size guide, PDP measurements |
| **Delivery/expectations** | support "where's my order" volume | shipping copy, ETA clarity |

---

## The loop (weekly)

```
COLLECT (reviews + survey + support + Clarity)
  → TAG by theme (product / fit / delivery / price / UX)
  → COUNT (what's asked/complained 3+ times = real, not noise)
  → ACT (one fix: copy, FAQ, size guide, product, process)
  → CLOSE (reply to the customer; update the macro/FAQ)
```

Review tags every week (part of the weekly review in
`CONVERSION_OPTIMIZATION_OPERATING_SYSTEM.md`). Rising volume in any tag is a
**signal to fix the root cause**, not just answer faster.

---

## Turning feedback into growth

- **Great reviews →** feature on PDPs (schema-eligible), ads, email, social UGC.
- **Objections →** pre-empt them in PDP copy, FAQ, and ad hooks (use the
  customer's exact words — highest-converting copy there is).
- **Refund reasons →** fix sizing charts, product QC, or expectation-setting;
  each fixed reason lifts margin.
- **Product requests →** validate demand before building; bundle existing SKUs
  to test appetite first.
- **NPS promoters →** ask for referrals/reviews; **detractors →** recover
  personally (`CUSTOMER_SUPPORT_PLAYBOOK.md`).

---

## Metrics to track

- Review rate (reviews ÷ orders) — target ≥ 10–20% with the flow.
- Average rating + rating trend.
- NPS (promoters − detractors).
- Complaint themes (counts, week over week).
- Refund reasons (categorized).
- % of feedback that led to a shipped change (the real health metric).

**Goal:** every week, at least one customer-driven improvement ships. That is the
flywheel — better product → better reviews → lower CAC → more customers → more
feedback.
