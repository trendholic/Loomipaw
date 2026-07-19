'use strict';
/** Customer-facing order history & lookup. */
const express = require('express');
const db = require('../db');
const { asyncHandler, HttpError } = require('../lib/util');
const { requireAuth } = require('../middleware/auth');
const orders = require('../services/orders');

const router = express.Router();

// List the logged-in customer's orders.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ orders: rows.map((o) => orders.withItems(o)) });
}));

// Look up a single order.
//  • Logged-in users: by number, must own it.
//  • Guests: by number + matching email (?email=).
router.get('/:number', asyncHandler(async (req, res) => {
  const order = orders.byNumber(req.params.number);
  if (!order) throw new HttpError(404, 'Order not found');
  const isOwner = req.user && order.user_id === req.user.id;
  const isAdmin = req.user && req.user.role === 'admin';
  const emailMatch = req.query.email && String(req.query.email).toLowerCase() === order.email.toLowerCase();
  if (!isOwner && !isAdmin && !emailMatch) throw new HttpError(403, 'You are not authorized to view this order');
  res.json({ order: orders.withItems(order) });
}));

module.exports = router;
