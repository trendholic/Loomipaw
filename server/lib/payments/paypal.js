'use strict';
/**
 * PayPal adapter — implements the shared payment interface using the
 * PayPal Orders v2 REST API (no SDK dependency; uses fetch).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ TO GO LIVE WITH PAYPAL:                                              │
 * │  1. Set in .env:                                                    │
 * │       PAYMENT_PROVIDER=paypal                                       │
 * │       PAYPAL_CLIENT_ID=...                                          │
 * │       PAYPAL_CLIENT_SECRET=...                                      │
 * │       PAYPAL_ENV=sandbox            (or "live")                     │
 * │       PAYPAL_WEBHOOK_ID=...          (for /api/webhooks/paypal)     │
 * │  2. On the client, render the PayPal Buttons with the returned      │
 * │     `ref` (order id); the buyer approves, then checkout calls       │
 * │     confirmPayment which captures it server-side.                   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The checkout flow is unchanged: createPaymentIntent → confirmPayment →
 * (optional) refund, exactly like every other provider.
 */
const config = require('../../config');

const BASE = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

function creds() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured. See server/lib/payments/paypal.js');
  return { id, secret };
}

async function token() {
  const { id, secret } = creds();
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('PayPal auth failed');
  return (await res.json()).access_token;
}

async function api(path, method, body, tok) {
  const res = await fetch(`${BASE()}${path}`, {
    method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `PayPal API error (${res.status})`);
  return data;
}

module.exports = {
  name: 'paypal',
  isConfigured: () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),

  async createPaymentIntent({ amountCents, currency = 'USD', order }) {
    const tok = await token();
    const o = await api('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order?.number || undefined,
        amount: { currency_code: currency.toUpperCase(), value: (amountCents / 100).toFixed(2) },
      }],
    }, tok);
    return { ref: o.id, clientSecret: null, status: 'requires_action' };
  },

  // Capture the buyer-approved order.
  async confirmPayment({ ref }) {
    const tok = await token();
    const cap = await api(`/v2/checkout/orders/${ref}/capture`, 'POST', {}, tok);
    const ok = cap.status === 'COMPLETED';
    return { ref, status: ok ? 'succeeded' : 'failed', message: ok ? '' : 'Payment not completed', raw: cap };
  },

  async refund({ ref, amountCents, currency = 'USD' }) {
    const tok = await token();
    // `ref` here is the capture id; resolve from the order if needed upstream.
    const r = await api(`/v2/payments/captures/${ref}/refund`, 'POST',
      amountCents ? { amount: { value: (amountCents / 100).toFixed(2), currency_code: currency.toUpperCase() } } : {}, tok);
    return { ref: r.id, status: 'refunded', raw: r };
  },

  // PayPal webhook verification is done via the verify-webhook-signature API.
  async verifyWebhook(rawBody, headers) {
    const tok = await token();
    const verify = await api('/v1/notifications/verify-webhook-signature', 'POST', {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody.toString()),
    }, tok);
    if (verify.verification_status !== 'SUCCESS') throw new Error('PayPal webhook verification failed');
    const event = JSON.parse(rawBody.toString());
    const map = { 'PAYMENT.CAPTURE.COMPLETED': 'succeeded', 'PAYMENT.CAPTURE.DENIED': 'failed', 'PAYMENT.CAPTURE.REFUNDED': 'refunded' };
    return {
      type: event.event_type,
      status: map[event.event_type] || 'ignored',
      orderNumber: event.resource?.purchase_units?.[0]?.reference_id || event.resource?.custom_id || '',
      ref: event.resource?.id || '',
    };
  },
};
