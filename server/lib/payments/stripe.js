'use strict';
/**
 * Stripe adapter — implements the shared payment interface.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ TO GO LIVE WITH STRIPE:                                              │
 * │  1. `npm install stripe`                                            │
 * │  2. Set in .env:                                                    │
 * │       PAYMENT_PROVIDER=stripe                                       │
 * │       STRIPE_SECRET_KEY=sk_live_or_test_...                         │
 * │       STRIPE_PUBLISHABLE_KEY=pk_...                                 │
 * │       STRIPE_WEBHOOK_SECRET=whsec_...   (for /api/webhooks/stripe)  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The `stripe` package is loaded lazily so the app runs fine without it
 * while the dev provider is active. Checkout code never changes.
 */
const config = require('../../config');
const logger = require('../logger');

let _client = null;
function client() {
  const key = config.payments.stripe.secretKey;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured. See server/lib/payments/stripe.js');
  if (!_client) {
    let Stripe;
    try { Stripe = require('stripe'); }
    catch { throw new Error('The "stripe" package is not installed. Run: npm install stripe'); }
    _client = Stripe(key, { apiVersion: '2024-06-20', maxNetworkRetries: 2 });
  }
  return _client;
}

const STATUS = { succeeded: 'succeeded', processing: 'requires_action', requires_action: 'requires_action', requires_payment_method: 'failed', canceled: 'failed' };

module.exports = {
  name: 'stripe',
  isConfigured: () => Boolean(config.payments.stripe.secretKey),

  async createPaymentIntent({ amountCents, currency = 'usd', order, metadata = {} }) {
    const intent = await client().paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { orderNumber: order?.number || '', ...metadata },
    });
    return { ref: intent.id, clientSecret: intent.client_secret, status: STATUS[intent.status] || 'requires_action' };
  },

  // Server-side confirmation is normally driven by the webhook; this
  // retrieves the current intent state so the checkout can react immediately
  // (e.g. Stripe test cards that succeed synchronously).
  async confirmPayment({ ref }) {
    const intent = await client().paymentIntents.retrieve(ref);
    return { ref, status: STATUS[intent.status] || 'failed', message: intent.last_payment_error?.message || '', raw: intent };
  },

  async refund({ ref, amountCents }) {
    const refund = await client().refunds.create({ payment_intent: ref, ...(amountCents ? { amount: amountCents } : {}) });
    return { ref: refund.id, status: 'refunded', raw: refund };
  },

  // Verify + parse a webhook. Returns { type, orderNumber, status, ref }.
  verifyWebhook(rawBody, signature) {
    const secret = config.payments.stripe.webhookSecret;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    const event = client().webhooks.constructEvent(rawBody, signature, secret);
    const obj = event.data?.object || {};
    const map = {
      'payment_intent.succeeded': 'succeeded',
      'payment_intent.payment_failed': 'failed',
      'charge.refunded': 'refunded',
    };
    return {
      type: event.type,
      status: map[event.type] || 'ignored',
      orderNumber: obj.metadata?.orderNumber || '',
      ref: obj.id || '',
    };
  },
};

logger.debug('Stripe adapter loaded (inactive until STRIPE_SECRET_KEY is set)');
