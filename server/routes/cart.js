'use strict';
const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../lib/util');
const { validate } = require('../middleware/validate');
const cart = require('../services/cart');
const coupons = require('../services/coupons');

const router = express.Router();

// Optional coupon/shipping context carried via query for pricing preview.
function view(req, res) {
  const c = cart.resolve(req, res);
  const couponCode = req.query.coupon || req.cookies?.lp_coupon || null;
  const shippingMethodId = req.query.method || null;
  return cart.detail(c, { couponCode, shippingMethodId });
}

router.get('/', asyncHandler(async (req, res) => res.json({ cart: view(req, res) })));

router.post('/items', validate({ body: z.object({ variantId: z.coerce.number().int().positive(), qty: z.coerce.number().int().min(1).max(99).optional() }) }),
  asyncHandler(async (req, res) => {
    const c = cart.resolve(req, res);
    cart.addItem(c, req.body.variantId, req.body.qty || 1);
    res.status(201).json({ cart: cart.detail(c, { couponCode: req.query.coupon || null }) });
  }));

router.patch('/items/:variantId', validate({ body: z.object({ qty: z.coerce.number().int().min(0).max(99) }) }),
  asyncHandler(async (req, res) => {
    const c = cart.resolve(req, res);
    cart.setItem(c, Number(req.params.variantId), req.body.qty);
    res.json({ cart: cart.detail(c, { couponCode: req.query.coupon || null }) });
  }));

router.delete('/items/:variantId', asyncHandler(async (req, res) => {
  const c = cart.resolve(req, res);
  cart.removeItem(c, Number(req.params.variantId));
  res.json({ cart: cart.detail(c, { couponCode: req.query.coupon || null }) });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const c = cart.resolve(req, res);
  cart.clear(c);
  res.json({ cart: cart.detail(c) });
}));

// Validate & apply a coupon (stored in a cookie so pricing persists).
router.post('/coupon', validate({ body: z.object({ code: z.string().trim().min(1).max(40) }) }),
  asyncHandler(async (req, res) => {
    const c = cart.resolve(req, res);
    const detail = cart.detail(c, { couponCode: req.body.code });
    if (detail.coupon && detail.coupon.invalid) {
      return res.status(422).json({ error: detail.coupon.reason, cart: detail });
    }
    res.cookie('lp_coupon', req.body.code, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000, path: '/' });
    res.json({ cart: detail });
  }));

router.delete('/coupon', asyncHandler(async (req, res) => {
  res.clearCookie('lp_coupon', { path: '/' });
  const c = cart.resolve(req, res);
  res.json({ cart: cart.detail(c) });
}));

module.exports = router;
