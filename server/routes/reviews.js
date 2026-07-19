'use strict';
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { asyncHandler, HttpError } = require('../lib/util');
const { validate } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

function refreshRating(productId) {
  const row = db.prepare("SELECT COUNT(*) n, COALESCE(AVG(rating),0) avg FROM reviews WHERE product_id = ? AND status='approved'").get(productId);
  db.prepare('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?')
    .run(Math.round(row.avg * 10) / 10, row.n, productId);
}

// List approved reviews for a product.
router.get('/product/:slug', asyncHandler(async (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) throw new HttpError(404, 'Product not found');
  const reviews = db.prepare("SELECT id, author_name, rating, title, body, verified, created_at FROM reviews WHERE product_id = ? AND status='approved' ORDER BY created_at DESC").all(product.id);
  res.json({ reviews });
}));

// Submit a review (guests allowed; auto-verified if the user purchased it).
router.post('/product/:slug', writeLimiter,
  validate({ body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().trim().max(140).optional(),
    body: z.string().trim().min(3, 'Please add a little more detail').max(3000),
    name: z.string().trim().min(1).max(120).optional(),
  }) }),
  asyncHandler(async (req, res) => {
    const product = db.prepare("SELECT id FROM products WHERE slug = ? AND status='active'").get(req.params.slug);
    if (!product) throw new HttpError(404, 'Product not found');
    const { rating, title, body, name } = req.body;

    let authorName = name || 'Anonymous';
    let verified = 0;
    if (req.user) {
      authorName = name || req.user.name || 'Loomipaw customer';
      const purchased = db.prepare(`SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
                                    WHERE o.user_id = ? AND oi.product_id = ? LIMIT 1`).get(req.user.id, product.id);
      verified = purchased ? 1 : 0;
    }
    // New reviews are held for moderation (status='pending') by default.
    const info = db.prepare('INSERT INTO reviews (product_id, user_id, author_name, rating, title, body, status, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(product.id, req.user ? req.user.id : null, authorName, rating, title || '', body, 'pending', verified);
    res.status(201).json({ ok: true, id: info.lastInsertRowid, message: 'Thank you! Your review will appear once approved.' });
  }));

module.exports = { router, refreshRating };
