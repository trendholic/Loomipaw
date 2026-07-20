'use strict';
/** Categories, search, newsletter, contact, and public store settings. */
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { asyncHandler } = require('../lib/util');
const { validate } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const catalog = require('../services/catalog');
const settings = require('../services/settings');
const config = require('../config');
const mailer = require('../lib/mailer');
const logger = require('../lib/logger');

const router = express.Router();

// --- Categories ---
router.get('/categories', asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT id, slug, name, description, image, position FROM categories ORDER BY position, name').all();
  const counts = db.prepare("SELECT category_id, COUNT(*) n FROM products WHERE status='active' GROUP BY category_id").all();
  const map = Object.fromEntries(counts.map((c) => [c.category_id, c.n]));
  res.json({ categories: rows.map((c) => ({ ...c, count: map[c.id] || 0 })) });
}));

// --- Search (products + suggestions) ---
router.get('/search',
  validate({ query: z.object({ q: z.string().min(1), limit: z.coerce.number().int().min(1).max(20).optional() }) }),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.validated.query;
    const rows = db.prepare(`SELECT * FROM products WHERE status='active' AND (title LIKE @q OR subtitle LIKE @q OR description LIKE @q)
                             ORDER BY best_seller DESC, rating_avg DESC LIMIT @limit`)
      .all({ q: `%${q}%`, limit: limit || 8 });
    res.json({ query: q, results: catalog.serializeMany(rows) });
  }));

// --- Public store settings (safe subset) ---
router.get('/settings', asyncHandler(async (req, res) => {
  const s = settings.all();
  res.json({
    store: s.store,
    shipping: { freeThresholdCents: s.shipping.freeThresholdCents, methods: s.shipping.methods },
    tax: { ratePercent: s.tax.ratePercent, includedInPrice: s.tax.includedInPrice },
    payments: { provider: s.payments.provider },
    analytics: config.analytics,
    csrfToken: req.csrfToken,
  });
}));

// --- Newsletter ---
router.post('/newsletter', writeLimiter,
  validate({ body: z.object({ email: z.string().trim().toLowerCase().email() }) }),
  asyncHandler(async (req, res) => {
    db.prepare('INSERT INTO newsletter (email) VALUES (?) ON CONFLICT(email) DO NOTHING').run(req.body.email);
    res.status(201).json({ ok: true, message: 'You are on the list.' });
  }));

// --- Contact form ---
router.post('/contact', writeLimiter,
  validate({ body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().max(160).optional(),
    message: z.string().trim().min(5, 'Please write a little more').max(4000),
  }) }),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;
    const info = db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
      .run(name, email, subject || '', message);
    mailer.sendContactReceipt({ id: info.lastInsertRowid, name, email, subject, message })
      .catch((e) => logger.warn('contact email failed', { e: e.message }));
    res.status(201).json({ ok: true, message: 'Thanks — we’ll be in touch shortly.' });
  }));

module.exports = router;
