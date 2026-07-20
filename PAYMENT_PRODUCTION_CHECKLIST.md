# Loomipaw — Payment Production Checklist

The checkout flow is **provider-agnostic**: `createPaymentIntent → confirmPayment
→ refund`, plus signature-verified webhooks. Switching providers is
configuration only — the checkout code never changes.

> ⚠️ **No test-payment logic runs in production.** The simulated `dev` provider
> only activates when `PAYMENT_PROVIDER=dev`. In production the app **warns on
> boot** if `dev` is still selected (see `server/lib/validateEnv.js`), and the
> checkout displays the active provider. Set `PAYMENT_PROVIDER=stripe|paypal`
> before accepting real customers.

---

## Pre-flight

- [ ] `PAYMENT_PROVIDER` set to `stripe` or `paypal` (not `dev`).
- [ ] Live API keys in `.env` (`sk_live_…` for Stripe; live PayPal creds with `PAYPAL_ENV=live`).
- [ ] Webhook endpoint registered with the provider and its secret/id in `.env`.
- [ ] `APP_URL` is the public https URL (used in webhook/return URLs & emails).
- [ ] For Stripe: `npm install stripe` (the adapter loads the SDK lazily).

---

## Stripe

| # | Test | How | Expected |
|---|------|-----|----------|
| 1 | **Successful payment** | Checkout with `4242 4242 4242 4242` (test mode) or a real card (live) | Order created, `financial_status=paid`, status `processing`, confirmation email sent, stock decremented |
| 2 | **Failed payment** | Card `4000 0000 0000 0002` (decline) | HTTP 402, order marked `cancelled`, **stock released**, cart preserved |
| 3 | **Webhook verification** | Trigger `payment_intent.succeeded` from Stripe CLI/dashboard to `/api/webhooks/stripe` | 200 `{received:true}`; a still-pending order is finalized. Bad signature → **400** |
| 4 | **Refund** | Admin → order → **Refund order** | Stripe refund created, order `refunded`, **stock restocked**, customer emailed, event in Activity Log; second refund → 409 |

**Stripe setup:** Dashboard → Developers → Webhooks → add endpoint
`https://your-domain.com/api/webhooks/stripe`, subscribe to
`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`;
copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

Test the webhook locally:
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

---

## PayPal

| # | Test | How | Expected |
|---|------|-----|----------|
| 5 | **Payment** | Checkout via PayPal Buttons (sandbox account) → approve | Order captured (`COMPLETED`), `paid`, confirmation email, stock decremented |
| 6 | **Webhook verification** | Send `PAYMENT.CAPTURE.COMPLETED` to `/api/webhooks/paypal` | 200; order reconciled. Failed signature verification → **400** |
| 7 | **Refund & inventory reconciliation** | Admin → order → **Refund order** | PayPal refund issued, order `refunded`, **stock restored to pre-order level**, customer emailed |

**PayPal setup:** Developer dashboard → your app → Webhooks → add
`https://your-domain.com/api/webhooks/paypal`, subscribe to
`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`,
`PAYMENT.CAPTURE.REFUNDED`; copy the Webhook ID to `PAYPAL_WEBHOOK_ID`; set
`PAYPAL_ENV=live` and live client id/secret.

---

## Already verified in automated tests (dev provider)

The full pipeline — success, decline (with stock release), refund (with
restock), and double-refund protection — is covered by
`server/test/flow.test.js`. The Stripe/PayPal adapters implement the identical
interface, so only the provider's own sandbox tests (1–7 above) remain to run
against real credentials.

---

## Reconciliation notes

- **Stock**: decremented atomically at order creation; released on failure/
  cancel; restored on refund. (Verified by test: refund restocks the exact
  quantity.)
- **Idempotency**: webhook "succeeded" only finalizes an order that isn't
  already `paid`; refunds are blocked once an order is `refunded`.
- **Failed-payment recovery**: a declined/failed payment cancels the order and
  returns the stock, leaving the customer's cart intact so they can retry.
