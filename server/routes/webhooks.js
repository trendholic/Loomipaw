'use strict';
/**
 * Payment gateway webhooks (server-to-server). These bypass CSRF because
 * they carry a cryptographic signature that the provider adapter verifies;
 * they require the RAW request body, so this router is mounted with
 * express.raw() BEFORE the JSON parser in app.js.
 *
 *   POST /api/webhooks/stripe
 *   POST /api/webhooks/paypal
 *
 * On a verified "succeeded" event we finalize a still-pending order; on
 * "failed" we release its reserved stock; on "refunded" we reconcile.
 */
const express = require('express');
const payments = require('../lib/payments');
const orders = require('../services/orders');
const mailer = require('../lib/mailer');
const audit = require('../services/audit');
const logger = require('../lib/logger');

const router = express.Router();

async function handle(providerName, verify, req, res) {
  const provider = payments.byName(providerName);
  if (!provider || typeof provider.verifyWebhook !== 'function') return res.status(404).json({ error: 'Provider not available' });
  let event;
  try {
    event = await verify(provider, req);
  } catch (e) {
    logger.warn(`${providerName} webhook verification failed`, { error: e.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const order = event.orderNumber ? orders.byNumber(event.orderNumber) : null;
  if (order) {
    if (event.status === 'succeeded' && order.financial_status !== 'paid') {
      const paid = orders.markPaid(order, event.ref);
      orders.recordPayment(order.id, { provider: providerName, ref: event.ref, amountCents: order.total_cents, currency: order.currency, status: 'succeeded', raw: { webhook: event.type } });
      mailer.sendOrderConfirmation(orders.withItems(paid)).catch(() => {});
      audit.log(req, 'payment.webhook.paid', `order:${order.number}`);
    } else if (event.status === 'failed' && order.financial_status !== 'paid') {
      orders.markFailed(order);
      audit.log(req, 'payment.webhook.failed', `order:${order.number}`);
    } else if (event.status === 'refunded' && order.status !== 'refunded') {
      orders.updateStatus(order, 'refunded');
      audit.log(req, 'payment.webhook.refunded', `order:${order.number}`);
    }
  }
  res.json({ received: true });
}

router.post('/stripe', (req, res) =>
  handle('stripe', (p, r) => p.verifyWebhook(r.body, r.get('stripe-signature')), req, res));

router.post('/paypal', (req, res) =>
  handle('paypal', (p, r) => p.verifyWebhook(r.body, r.headers), req, res));

module.exports = router;
