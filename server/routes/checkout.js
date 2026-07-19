'use strict';
const express = require('express');
const { z } = require('zod');
const { asyncHandler, HttpError } = require('../lib/util');
const { validate } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const cart = require('../services/cart');
const orders = require('../services/orders');
const payments = require('../lib/payments');
const mailer = require('../lib/mailer');
const logger = require('../lib/logger');

const router = express.Router();

const addressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  address1: z.string().trim().min(1, 'Address is required').max(200),
  address2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1, 'City is required').max(120),
  region: z.string().trim().min(1, 'State/Region is required').max(120),
  postal: z.string().trim().min(1, 'Postal code is required').max(40),
  country: z.string().trim().min(1, 'Country is required').max(120),
  phone: z.string().trim().max(40).optional().default(''),
});

/**
 * POST /api/checkout
 * One-call checkout: prices the cart authoritatively, reserves stock,
 * creates the order, runs the payment through the abstraction layer, and
 * finalizes. Client never dictates prices.
 */
router.post('/', writeLimiter,
  validate({ body: z.object({
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    shipping: addressSchema,
    billing: addressSchema.optional(),
    shippingMethodId: z.string().optional(),
    coupon: z.string().trim().max(40).optional(),
    payment: z.object({
      method: z.string().optional().default('card'),
      cardNumber: z.string().optional(),
      expiry: z.string().optional(),
      cvc: z.string().optional(),
      name: z.string().optional(),
    }).optional().default({}),
  }) }),
  asyncHandler(async (req, res) => {
    const c = cart.resolve(req, res);
    const couponCode = req.body.coupon || req.cookies?.lp_coupon || null;
    const priced = cart.detail(c, { couponCode, shippingMethodId: req.body.shippingMethodId });

    if (!priced.items.length) throw new HttpError(400, 'Your cart is empty');
    if (priced.coupon && priced.coupon.invalid) throw new HttpError(422, `Coupon: ${priced.coupon.reason}`);

    const provider = payments.name;

    // 1) Reserve stock + create pending order (atomic).
    const order = orders.createPendingOrder({
      cart: c,
      priced,
      contact: { email: req.body.email },
      shippingAddress: req.body.shipping,
      billingAddress: req.body.billing || req.body.shipping,
      provider,
    });

    try {
      // 2) Create intent + confirm through the payment abstraction.
      const intent = await payments.createPaymentIntent({
        amountCents: order.total_cents, currency: order.currency, order,
        metadata: { orderNumber: order.number },
      });
      const result = await payments.confirmPayment({ ref: intent.ref, paymentDetails: req.body.payment });

      orders.recordPayment(order.id, {
        provider, ref: result.ref, amountCents: order.total_cents,
        currency: order.currency, status: result.status, raw: result.raw,
      });

      if (result.status !== 'succeeded') {
        orders.markFailed(order);
        throw new HttpError(402, result.message || 'Payment was declined. Please try another card.');
      }

      // 3) Success — finalize.
      const paid = orders.markPaid(order, result.ref);
      cart.clear(c);
      res.clearCookie('lp_coupon', { path: '/' });

      const full = orders.withItems(paid);
      mailer.sendOrderConfirmation(full).catch((e) => logger.warn('order email failed', { e: e.message }));

      res.status(201).json({
        ok: true,
        order: {
          number: paid.number, email: paid.email, status: paid.status,
          totalCents: paid.total_cents, currency: paid.currency,
        },
      });
    } catch (err) {
      // If payment threw unexpectedly, ensure stock is released.
      if (!(err instanceof HttpError) || err.status >= 500) {
        try { orders.markFailed(order); } catch (_) {}
      }
      throw err;
    }
  }));

module.exports = router;
