'use strict';
/**
 * Payment abstraction layer.
 *
 * Every provider implements the same interface so the checkout flow never
 * changes when you swap gateways:
 *
 *   createPaymentIntent({ amountCents, currency, order, metadata }) -> { ref, clientSecret?, status }
 *   confirmPayment({ ref, paymentDetails })                         -> { status, ref, raw }
 *   refund({ ref, amountCents })                                    -> { status, ref, raw }
 *
 * status ∈ 'requires_action' | 'succeeded' | 'failed' | 'refunded'
 *
 * The `dev` provider simulates real success/failure so the entire checkout
 * pipeline is exercisable without any third-party credentials. To go live,
 * set PAYMENT_PROVIDER=stripe and add STRIPE_SECRET_KEY (see stripe.js).
 */
const config = require('../../config');
const settings = require('../../services/settings');
const dev = require('./dev');
const stripe = require('./stripe');
const paypal = require('./paypal');

const providers = { dev, stripe, paypal };

function active() {
  const name = (settings.get('payments')?.provider || config.payments.provider || 'dev').toLowerCase();
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}

module.exports = {
  get name() { return active().name; },
  isConfigured: () => active().isConfigured(),
  createPaymentIntent: (args) => active().createPaymentIntent(args),
  confirmPayment: (args) => active().confirmPayment(args),
  refund: (args) => active().refund(args),
  active,
  byName: (name) => providers[name] || null,
};
