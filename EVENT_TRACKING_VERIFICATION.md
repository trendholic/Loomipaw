# Loomipaw — Event Tracking Verification

How to verify every analytics event fires correctly across GA4, Meta Pixel,
and TikTok Pixel. The instrumentation lives in
`public/assets/js/analytics.js` (vendor loaders) and `Loom.track()` in
`public/assets/js/main.js` (canonical event → vendor mapping). Vendors load
only when their env ID is set, and the CSP opens only for configured vendors
(verified in `CONVERSION_OPTIMIZATION_REPORT.md`).

## Configure first

```
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
META_PIXEL_ID=1234567890
TIKTOK_PIXEL_ID=C9XXXXXXXXXXXXXXXX
CLARITY_PROJECT_ID=abcdef1234     # heatmaps/replay, no ecommerce events
```
Restart, then load the storefront and confirm in DevTools → Network that
`gtag/js`, `fbevents.js`, and `events.js` (TikTok) load with **200**, and no
CSP violation appears in the Console.

---

## Canonical → vendor event map (as implemented)

| Canonical (`Loom.track`) | Fires on | GA4 event | Meta event | TikTok event |
|--------------------------|----------|-----------|------------|--------------|
| `view_item` | PDP load (`product.js`) | `view_item` | `ViewContent` | `ViewContent` |
| `add_to_cart` | any add (`main.js addToCart`) | `add_to_cart` | `AddToCart` | `AddToCart` |
| `begin_checkout` | checkout load (`checkout.js`) | `begin_checkout` | `InitiateCheckout` | `InitiateCheckout` |
| `purchase` | order confirmation, once/order (`order.js`) | `purchase` | `Purchase` | `CompletePayment` |

Every event carries `currency`, `value` (dollars), and an `items` array
(`item_id`, `item_name`, `price`, `quantity`). `purchase` also sends
`transaction_id` (order number) and is de-duplicated per order via
`sessionStorage`.

---

## GA4 verification

**Realtime + DebugView.**
1. GA4 → **Admin → DebugView**; enable debug (GA Debugger extension or
   `?gtm_debug=1`).
2. Walk the funnel and confirm each event appears with parameters:
   - `view_item` → `items[]`, `value`, `currency`.
   - `add_to_cart` → item + value.
   - `begin_checkout` → all cart items + subtotal value.
   - `purchase` → `transaction_id`, `value` (order total), `items[]`.
3. **Mark as conversions:** GA4 → Admin → Events → toggle `purchase` (and
   optionally `begin_checkout`, `add_to_cart`) as **Key events**.
4. **Revenue:** confirm `purchase.value` populates Monetization → Ecommerce
   purchases, and `items` populate Item report (name, quantity, revenue).
5. **Funnel:** build a Funnel exploration `view_item → add_to_cart →
   begin_checkout → purchase`; verify drop-off renders.

**Pass criteria:** all 4 events in DebugView with correct value/items;
`purchase` revenue matches the order total; funnel populated.

---

## Meta Pixel verification

1. Install **Meta Pixel Helper** (Chrome).
2. Walk the funnel; the helper should show `PageView`, then `ViewContent`,
   `AddToCart`, `InitiateCheckout`, `Purchase` with `value`, `currency`,
   `content_ids`, `contents`.
3. Events Manager → **Test Events**: enter the site URL and confirm live
   receipt + no "missing parameter" warnings on `Purchase`.
4. Set `Purchase` as the optimization/conversion event for ad campaigns.
5. *(Recommended)* add the **Conversions API** server-side later for iOS/ad-block
   resilience — the `purchase` server event can post from `routes/checkout.js`.

**Pass criteria:** Pixel Helper shows all events; Test Events confirms
`Purchase` with matching `value` and `content_ids`.

---

## TikTok Pixel verification

1. Install **TikTok Pixel Helper**.
2. Walk the funnel; confirm `Pageview`, `ViewContent`, `AddToCart`,
   `InitiateCheckout`, and **`CompletePayment`** with `value`, `currency`,
   `contents`.
3. TikTok Events Manager → **Test Event** code to validate live receipt.
4. Set `CompletePayment` as the campaign optimization event.

**Pass criteria:** Pixel Helper shows all events; `CompletePayment` value
matches the order total.

---

## Microsoft Clarity

No ecommerce events — verify the dashboard receives **sessions + heatmaps**
within ~2 hours of first traffic. Use recordings to spot checkout friction and
rage-clicks (great qualitative complement to GA4 quant funnels).

---

## End-to-end smoke test (5 minutes)

1. Open the site with all four helpers/DebugView active.
2. View a product → confirm `view_item` / `ViewContent` (×3 vendors).
3. Add to cart → confirm `add_to_cart` / `AddToCart`.
4. Go to checkout → confirm `begin_checkout` / `InitiateCheckout`.
5. Place a **test order** (dev provider `4242…` or gateway sandbox) → confirm
   `purchase` / `Purchase` / `CompletePayment` with the correct
   `transaction_id` and total.
6. Refresh the confirmation page → confirm `purchase` does **not** fire again
   (de-dupe working).

Record results in a checklist and keep it with go-live sign-off. Re-run after
any change to `analytics.js`, `main.js`, `checkout.js`, or `order.js`.
