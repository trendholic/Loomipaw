'use strict';
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { asyncHandler, HttpError } = require('../lib/util');
const { validate } = require('../middleware/validate');
const catalog = require('../services/catalog');

const router = express.Router();

// GET /api/products  — list with filter / sort / search / pagination
router.get('/',
  validate({ query: z.object({
    category: z.string().optional(),
    q: z.string().optional(),
    sort: z.enum(['featured', 'price-asc', 'price-desc', 'rating', 'reviews', 'newest']).optional(),
    tag: z.string().optional(),
    featured: z.string().optional(),
    bestSeller: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(60).optional(),
  }) }),
  asyncHandler(async (req, res) => {
    const f = req.validated.query;
    const where = ["p.status = 'active'"];
    const params = {};
    if (f.category && f.category !== 'all') { where.push('c.slug = @category'); params.category = f.category; }
    if (f.tag) { where.push('p.tag = @tag'); params.tag = f.tag; }
    if (f.featured === 'true') where.push('p.featured = 1');
    if (f.bestSeller === 'true') where.push('p.best_seller = 1');
    if (f.minPrice != null) { where.push('p.price_cents >= @minP'); params.minP = Math.round(f.minPrice * 100); }
    if (f.maxPrice != null) { where.push('p.price_cents <= @maxP'); params.maxP = Math.round(f.maxPrice * 100); }
    if (f.q) { where.push('(p.title LIKE @q OR p.description LIKE @q OR p.subtitle LIKE @q)'); params.q = `%${f.q}%`; }

    const order = {
      'price-asc': 'p.price_cents ASC',
      'price-desc': 'p.price_cents DESC',
      'rating': 'p.rating_avg DESC, p.rating_count DESC',
      'reviews': 'p.rating_count DESC',
      'newest': 'p.created_at DESC',
      'featured': 'p.best_seller DESC, p.featured DESC, p.position ASC',
    }[f.sort || 'featured'];

    const limit = f.limit || 24;
    const page = f.page || 1;
    const base = `FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) n ${base}`).get(params).n;
    const rows = db.prepare(`SELECT p.* ${base} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit, offset: (page - 1) * limit });

    res.json({
      products: rows.map((p) => catalog.serialize(p)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }));

// GET /api/products/:slug
router.get('/:slug', asyncHandler(async (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE slug = ? AND status = 'active'").get(req.params.slug);
  if (!product) throw new HttpError(404, 'Product not found');
  const data = catalog.serialize(product, { full: true });

  // Related products (same category, else best sellers).
  let related = db.prepare("SELECT * FROM products WHERE status='active' AND category_id = ? AND id != ? ORDER BY best_seller DESC, rating_avg DESC LIMIT 4")
    .all(product.category_id, product.id);
  if (related.length < 4) {
    const extra = db.prepare("SELECT * FROM products WHERE status='active' AND id != ? ORDER BY best_seller DESC LIMIT 8").all(product.id);
    const seen = new Set(related.map((r) => r.id));
    for (const e of extra) { if (related.length >= 4) break; if (!seen.has(e.id)) related.push(e); }
  }

  const reviews = db.prepare("SELECT id, author_name, rating, title, body, verified, created_at FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 20").all(product.id);
  const dist = db.prepare("SELECT rating, COUNT(*) n FROM reviews WHERE product_id = ? AND status='approved' GROUP BY rating").all(product.id);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of dist) distribution[d.rating] = d.n;

  res.json({
    product: data,
    related: related.map((p) => catalog.serialize(p)),
    reviews,
    reviewSummary: { average: product.rating_avg, count: product.rating_count, distribution },
  });
}));

module.exports = router;
