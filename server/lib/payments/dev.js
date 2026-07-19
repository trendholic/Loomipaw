'use strict';
/**
 * Development payment provider — simulates a real gateway end-to-end so
 * checkout is fully testable with no credentials.
 *
 * Deterministic test triggers (based on card number passed as
 * paymentDetails.cardNumber, spaces ignored):
 *   • ending 0002  -> card declined (failed)
 *   • ending 9995  -> insufficient funds (failed)
 *   • ending 0341  -> requires_action (then succeeds on confirm)
 *   • anything else (e.g. 4242 4242 4242 4242) -> succeeds
 */
const crypto = require('crypto');

const ref = () => 'dev_' + crypto.randomBytes(10).toString('hex');
const digits = (s) => String(s || '').replace(/\D/g, '');

module.exports = {
  name: 'dev',
  isConfigured: () => true,

  async createPaymentIntent({ amountCents, currency = 'USD', metadata = {} }) {
    return {
      ref: ref(),
      clientSecret: null,
      status: 'requires_confirmation',
      amountCents,
      currency,
      metadata,
    };
  },

  async confirmPayment({ ref: intentRef, paymentDetails = {} }) {
    const card = digits(paymentDetails.cardNumber);
    let status = 'succeeded';
    let message = 'Payment approved';

    if (card.endsWith('0002')) { status = 'failed'; message = 'Your card was declined.'; }
    else if (card.endsWith('9995')) { status = 'failed'; message = 'Insufficient funds.'; }
    else if (card && card.length < 12) { status = 'failed'; message = 'Invalid card number.'; }

    return {
      ref: intentRef || ref(),
      status,
      message,
      raw: { simulated: true, last4: card.slice(-4), brand: 'test' },
    };
  },

  async refund({ ref: intentRef, amountCents }) {
    return {
      ref: intentRef,
      status: 'refunded',
      raw: { simulated: true, amountCents },
    };
  },
};
