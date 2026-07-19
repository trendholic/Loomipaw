'use strict';
/** Product read helpers — assembles products with images + variants. */
const db = require('../db');

const q = {
  imagesFor: db.prepare('SELECT id, url, srcset_json, alt, position FROM product_images WHERE product_id = ? ORDER BY position, id'),
  variantsFor: db.prepare('SELECT id, sku, color, color_hex, size, price_cents, stock, low_stock_at, position FROM variants WHERE product_id = ? ORDER BY position, id'),
  categoryById: db.prepare('SELECT id, slug, name FROM categories WHERE id = ?'),
};

function serializeImage(row) {
  let srcset = [];
  try { srcset = JSON.parse(row.srcset_json || '[]'); } catch { srcset = []; }
  return { id: row.id, url: row.url, srcset, alt: row.alt, position: row.position };
}

function serializeVariant(row, product) {
  return {
    id: row.id,
    sku: row.sku,
    color: row.color,
    colorHex: row.color_hex,
    size: row.size,
    priceCents: row.price_cents != null ? row.price_cents : product.price_cents,
    stock: row.stock,
    inStock: row.stock > 0,
    lowStock: row.stock > 0 && row.stock <= row.low_stock_at,
  };
}

function serialize(product, { full = false } = {}) {
  if (!product) return null;
  const images = q.imagesFor.all(product.id).map(serializeImage);
  const variants = q.variantsFor.all(product.id).map((v) => serializeVariant(v, product));
  const category = product.category_id ? q.categoryById.get(product.category_id) : null;
  const totalStock = variants.reduce((n, v) => n + v.stock, 0);
  const colors = [...new Map(variants.filter((v) => v.color).map((v) => [v.color, { name: v.color, hex: v.colorHex }])).values()];
  const sizes = [...new Set(variants.filter((v) => v.size).map((v) => v.size))];

  const base = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    category: category ? category.slug : null,
    categoryName: category ? category.name : null,
    priceCents: product.price_cents,
    compareAtCents: product.compare_at_cents,
    price: product.price_cents / 100,
    compareAt: product.compare_at_cents ? product.compare_at_cents / 100 : null,
    tag: product.tag,
    status: product.status,
    featured: !!product.featured,
    bestSeller: !!product.best_seller,
    rating: product.rating_avg,
    reviews: product.rating_count,
    inStock: totalStock > 0,
    totalStock,
    image: images[0]?.url || null,
    imageAlt: images[1]?.url || images[0]?.url || null,
    images,
    colors,
    sizes,
    variants,
  };

  if (full) {
    base.description = product.description;
    base.details = product.details;
    base.seoTitle = product.seo_title;
    base.seoDescription = product.seo_description;
  }
  return base;
}

module.exports = { serialize, serializeVariant, serializeImage };
