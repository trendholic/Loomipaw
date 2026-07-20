# Loomipaw — Customer Support Playbook

Everything a support agent (or founder) needs to resolve the common requests
fast, on-brand, and consistently. Voice: warm, human, confident, solution-first
— we talk about dogs like family, we never sound like a policy robot.

**Where support comes in:** the contact form (`POST /api/contact` → stored +
emailed to `STORE_EMAIL`), replies from that inbox, order tracking
(`/account/track.html`), and account order history. Refunds, shipping updates,
and order edits are performed in **Admin**.

**Brand facts to quote accurately:** free carbon-neutral shipping over **$75**;
ships in **1–2 business days**; **30-day happiness guarantee** with free returns;
OEKO-TEX® certified materials; 4.9★ / 12,000+ reviews.

**Service targets:** first response < 24h (aim < 4h business hours); resolution
< 48h; always acknowledge, always set a next step.

---

## Response principles

1. **Lead with empathy + the answer**, then the detail. No wall of policy.
2. **Own it** — "I'll sort this out for you," not "unfortunately our policy…".
3. **One clear next step** every reply.
4. **Use their dog's name** if you know it. This is a pet brand.
5. **Default to generosity** within reason — a happy customer is cheaper than a
   chargeback and worth repeat LTV.

Placeholders: `{first_name}`, `{dog_name}`, `{order_number}`, `{tracking}`,
`{eta}`, `{agent}`.

---

## 1. Shipping times

**Q: "When will my order arrive / has it shipped?"**

> Hi {first_name}, thanks for reaching out! 🐾 Your order **{order_number}**
> ships within 1–2 business days, and I can see it's {status}. Once it's on its
> way you'll get an email with tracking, and you can follow it anytime at
> loomipaw.com/account/track.html. Anything else I can help with?
> — {agent}

*If already shipped:* include `{tracking}` and `{eta}`.

## 2. Returns

**Q: "How do I return something?"**

> Absolutely, {first_name} — you're covered by our **30-day happiness
> guarantee**, and returns are free and easy. Just reply with your order number
> and which item(s) you'd like to return, and I'll send you a prepaid label
> right away. If it's a sizing swap, let me know the new size and I'll get the
> replacement moving too.

## 3. Product sizing

**Q: "What size should I get for my dog?"**

> Great question! The best way is to measure {dog_name}'s **chest at the widest
> point** and **neck circumference**, then match our size chart on the product
> page. If they're between sizes, we recommend **sizing up**. And because
> returns are free for 30 days, exchanges are painless if the fit isn't perfect.
> Tell me {dog_name}'s measurements and breed and I'm happy to recommend a size.

## 4. Product care

**Q: "How do I clean / care for this?"**

> Happy to help it last for years! 🐾
> • **Apparel (merino/knit):** gentle cold wash, lay flat to dry.
> • **Harness & lead:** wipe clean or gentle hand-wash; air dry.
> • **Beds & throws:** machine-washable — remove the cover, cold gentle cycle,
>   fluff to restore loft.
> Everything is OEKO-TEX® certified, so it's gentle on {dog_name}'s skin too.

## 5. Order changes

**Q: "Can I change my address / item / cancel?"**

> I'll do my best, {first_name}! Because we ship within 1–2 business days, I can
> update **{order_number}** if it hasn't left our facility yet. Reply with the
> change (new address / item / cancel) and I'll jump on it right away and
> confirm. If it's already shipped, I'll set up a free return or reroute instead.

*Agent action:* edit in Admin if unfulfilled; otherwise return/reship.

## 6. Refunds

**Q: "I'd like a refund."**

> Of course, {first_name} — no hassle at all. I've started your refund for
> **{order_number}**; it'll be back on your original payment method within
> 5–10 business days (your bank's timing). You'll get an email confirmation
> shortly. If it was a fit or quality issue, I'd love a quick note so we can
> keep improving — but no pressure. Thanks for giving us a try. 🐾

*Agent action:* Admin → order → **Refund** (restocks + emails automatically).

## 7. Damaged products

**Q: "My item arrived damaged / defective."**

> Oh no — I'm so sorry, {first_name}, that's not the Loomipaw standard. 🐾 No
> need to send anything back. Could you reply with a quick photo? I'll ship a
> **free replacement today** (or a full refund if you prefer). Thank you for
> your patience — we'll make this right.

*Agent action:* replacement order or refund; log the defect for QC.

## 8. Lost packages

**Q: "Tracking says delivered but I don't have it / it's stuck."**

> I'm sorry for the worry, {first_name}. Let's get {dog_name} their gear. First,
> please check with neighbors/household and any safe-drop spots — carriers
> sometimes mark early. If it doesn't turn up within 48 hours, reply here and
> I'll open a carrier trace and send a **free replacement or full refund** right
> away. You won't be left out of pocket.

*Agent action:* if unresolved in 48h, reship or refund; file carrier claim.

---

## Escalation & edge cases

- **Chargeback threat / very upset:** de-escalate, offer refund immediately,
  loop in the owner. Retention < ego.
- **Wrong item shipped:** free correct item today + keep/return the wrong one
  (agent discretion under ~$50).
- **Repeated returns / abuse:** be generous once or twice; flag patterns.
- **Wholesale / press / collab:** route to the founder inbox.

## Macros / canned-reply setup

Load sections 1–8 as saved replies in your helpdesk (or shared inbox). Keep the
placeholders; personalize the first line every time. Review monthly against real
tickets and add new macros for anything asked 3+ times.

## Metrics to watch (see `OPERATIONS_DASHBOARD_PLAN.md`)

First-response time, resolution time, ticket volume by topic, refund/replacement
rate, CSAT. Rising "sizing" or "damaged" volume is a **product signal** — feed
it back to merchandising/QC.
