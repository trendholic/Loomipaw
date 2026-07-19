'use strict';
/**
 * Stripe adapter (integration layer).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ TO GO LIVE WITH STRIPE:                                              │
 * │  1. `npm install stripe`                                            │
 * │  2. Set in .env:                                                    │
 * │       PAYMENT_PROVIDER=stripe                                       │
 * │       STRIPE_SECRET_KEY=sk_live_or_test_...                         │
 * │       STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...                    │
 * │       STRIPE_WEBHOOK_SECRET=whsec_...   (for async confirmation)    │
 * │  3. Uncomment the `require('stripe')` line below.                   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The checkout flow calls the same interface as every other provider, so no
 * checkout code changes are needed — only the config above.
 */
const config = require('../../config');
const logger = require('../logger');

// let Stripe = null;
// try { Stripe = require('stripe'); } catch { /* dependency not installed yet */ }

function client() {
  const key = config.payments.stripe.secretKey;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured. See server/lib/payments/stripe.js');
  // if (!Stripe) throw new Error('The "stripe" package is not installed. Run: npm install stripe');
  // return Stripe(key);
  throw new Error('Stripe SDK not installed. Run `npm install stripe` and uncomment the client in stripe.js.');
}

module.exports = {
  name: 'stripe',
  isConfigured: () => Boolean(config.payments.stripe.secretKey),

  async createPaymentIntent({ amountCents, currency = 'usd', order, metadata = {} }) {
    const stripe = client();
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { orderNumber: order?.number, ...metadata },
    });
    return { ref: intent.id, clientSecret: intent.client_secret, status: intent.status };
  },

  async confirmPayment({ ref }) {
    const stripe = client();
    const intent = await stripe.paymentIntents.retrieve(ref);
    const map = { succeeded: 'succeeded', processing: 'requires_action', requires_payment_method: 'failed' };
    return { ref, status: map[intent.status] || 'failed', raw: intent };
  },

  async refund({ ref, amountCents }) {
    const stripe = client();
    const refund = await stripe.refunds.create({ payment_intent: ref, ...(amountCents ? { amount: amountCents } : {}) });
    return { ref: refund.id, status: 'refunded', raw: refund };
  },
};

logger.debug('Stripe adapter loaded (inactive until STRIPE_SECRET_KEY is set)');
