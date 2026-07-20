# Loomipaw — Tracking Launch Checklist

Production sign-off for analytics. Instrumentation is already implemented
(`public/assets/js/analytics.js` + `Loom.track()` in `main.js`); this is the
**go/no-go verification** to complete before spending a dollar on ads.
Deeper per-event detail lives in `EVENT_TRACKING_VERIFICATION.md`.

> **Golden rule:** do not start paid acquisition until every `Purchase` /
> `purchase` / `CompletePayment` row below is ✅ and revenue matches real orders.

---

## 0. Configuration (env)

- [ ] `GA4_MEASUREMENT_ID=G-XXXXXXXXXX`
- [ ] `META_PIXEL_ID=…`
- [ ] `TIKTOK_PIXEL_ID=…`
- [ ] `CLARITY_PROJECT_ID=…` (optional; heatmaps/replay)
- [ ] Restart app; load storefront → DevTools **Network** shows `gtag/js`,
      `fbevents.js`, TikTok `events.js` all **200**, and **no CSP violations**
      in Console.
- [ ] Confirm each vendor's hosts appear in the response CSP **only** because its
      ID is set (verified behavior).

## 1. Google Analytics 4

Verify in **DebugView** (or Realtime) while walking the funnel:

- [ ] **Page views** — `page_view` fires on each navigation.
- [ ] **Product views** — `view_item` on PDP load, with `items[]`, `value`, `currency`.
- [ ] **Add to cart** — `add_to_cart` with item + value.
- [ ] **Begin checkout** — `begin_checkout` with all cart items + subtotal value.
- [ ] **Purchase** — `purchase` with `transaction_id`, order-total `value`, `items[]`.
- [ ] **Revenue** — Monetization → Ecommerce purchases shows the order total.
- [ ] **Product performance** — Item report lists product name, quantity, revenue.
- [ ] Mark `purchase` (and optionally `begin_checkout`) as **Key events**.
- [ ] Build funnel exploration `view_item → add_to_cart → begin_checkout → purchase`.
- [ ] Link GA4 ↔ Google Ads (for import) and ↔ Search Console.

## 2. Meta Pixel

Verify with **Meta Pixel Helper** + **Test Events**:

- [ ] **ViewContent** — on PDP, with `content_ids`, `value`, `currency`.
- [ ] **AddToCart** — on add.
- [ ] **InitiateCheckout** — on checkout load.
- [ ] **Purchase** — on confirmation, with matching `value` + `content_ids`.
- [ ] No "missing parameter" warnings on `Purchase`.
- [ ] Set `Purchase` as the campaign optimization event.
- [ ] Upload product **catalog feed** (for dynamic/retargeting ads).
- [ ] *(Recommended)* plan server-side **Conversions API** for resilience.

## 3. TikTok Pixel

Verify with **TikTok Pixel Helper** + **Test Event**:

- [ ] **ViewContent** — on PDP.
- [ ] **AddToCart** (AddCart) — on add.
- [ ] **InitiateCheckout** (Checkout) — on checkout load.
- [ ] **CompletePayment** — on confirmation, with matching `value`.
- [ ] Set `CompletePayment` as the campaign optimization event.

## 4. Microsoft Clarity (qualitative)

- [ ] Dashboard receives sessions + heatmaps within ~2 hours of first traffic.
- [ ] Recordings capture PDP → cart → checkout for friction analysis.

## 5. End-to-end smoke test (do this last)

- [ ] With all helpers + DebugView open, complete: view product → add to cart →
      checkout → place a **test order**.
- [ ] Confirm the full event chain fires on **all three** pixels.
- [ ] Confirm `purchase` **does not** re-fire on confirmation-page refresh
      (session de-dupe working).
- [ ] Confirm GA4 revenue == the test order total.

## 6. Sign-off

- [ ] All boxes ✅ · owner: __________ · date: __________
- [ ] Screenshots saved (DebugView, Pixel Helper, Test Events).

**Only when this is signed off does `PAID_AD_TESTING_PLAN.md` begin.**
