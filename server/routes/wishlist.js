'use strict';
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { asyncHandler, HttpError } = require('../lib/util');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const catalog = require('../services/catalog');

const router = express.Router();
router.use(requireAuth); // wishlist is tied to an account

router.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare(`SELECT p.* FROM wishlist_items w JOIN products p ON p.id = w.product_id
                           WHERE w.user_id = ? ORDER BY w.created_at DESC`).all(req.user.id);
  res.json({ items: rows.map((p) => catalog.serialize(p)) });
}));

router.post('/', validate({ body: z.object({ productId: z.coerce.number().int().positive() }) }),
  asyncHandler(async (req, res) => {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.body.productId);
    if (!product) throw new HttpError(404, 'Product not found');
    db.prepare('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?) ON CONFLICT DO NOTHING').run(req.user.id, product.id);
    res.status(201).json({ ok: true });
  }));

router.delete('/:productId', asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?').run(req.user.id, Number(req.params.productId));
  res.json({ ok: true });
}));

module.exports = router;
