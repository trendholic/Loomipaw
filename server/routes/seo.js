'use strict';
/**
 * SEO endpoints + server-side meta injection.
 *
 * Crawlers that don't execute JS still get correct, per-product <title>,
 * meta description, canonical, Open Graph / Twitter tags and Product +
 * Breadcrumb JSON-LD — injected into the static product.html at request time.
 * Also serves a dynamic XML sitemap (with image entries) and robots.txt.
 */
const fs = require('fs');
const express = require('express');
const db = require('../db');
const config = require('../config');
const catalog = require('../services/catalog');

const router = express.Router();
const abs = (p) => `${config.appUrl}${p}`;
const xmlEscape = (s) => String(s == null ? '' : s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const htmlEscape = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// --- robots.txt ---
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\n\nSitemap: ${abs('/sitemap.xml')}\n`
  );
});

// --- XML sitemap (with image extensions) ---
router.get('/sitemap.xml', (req, res) => {
  const products = db.prepare("SELECT slug, updated_at FROM products WHERE status='active' ORDER BY updated_at DESC").all();
  const cats = db.prepare('SELECT slug FROM categories ORDER BY position').all();
  const img = (slug) => {
    const row = db.prepare(`SELECT url FROM product_images WHERE product_id = (SELECT id FROM products WHERE slug = ?) ORDER BY position LIMIT 1`).get(slug);
    return row ? `<image:image><image:loc>${xmlEscape(abs(row.url))}</image:loc></image:image>` : '';
  };
  const staticPages = ['/', '/collection.html', '/contact.html', '/search.html'];
  const urls = [
    ...staticPages.map((p) => `<url><loc>${xmlEscape(abs(p))}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.7'}</priority></url>`),
    ...cats.map((c) => `<url><loc>${xmlEscape(abs('/collection.html?category=' + c.slug))}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
    ...products.map((p) => `<url><loc>${xmlEscape(abs('/product.html?slug=' + p.slug))}</loc><lastmod>${(p.updated_at || '').slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${img(p.slug)}</url>`),
  ];
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`
  );
});

// --- Product page meta injection ---
let template = null;
function productHtml() {
  if (template === null || !config.isProd) {
    try { template = fs.readFileSync(`${config.paths.public}/product.html`, 'utf8'); } catch { template = ''; }
  }
  return template;
}

function productMeta(req, res, next) {
  const slug = req.query.slug || req.query.id;
  if (!slug) return next();
  const row = db.prepare("SELECT * FROM products WHERE slug = ? AND status='active'").get(slug);
  let html = productHtml();
  if (!row || !html) return next();

  const p = catalog.serialize(row, { full: true });
  const url = abs('/product.html?slug=' + encodeURIComponent(p.slug));
  const image = p.image ? abs(p.image) : abs('/assets/img/hero.webp');
  const title = `${p.title} — Loomipaw`;
  const desc = (p.seoDescription || p.subtitle || p.description || '').slice(0, 300);
  const availability = p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.title, description: desc, sku: p.slug,
    image: p.images.map((im) => abs(im.url)),
    brand: { '@type': 'Brand', name: 'Loomipaw' },
    offers: {
      '@type': 'Offer', url, priceCurrency: config.store.currency,
      price: (p.priceCents / 100).toFixed(2), availability,
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(p.reviews > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews } } : {}),
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: abs('/collection.html') },
      ...(p.categoryName ? [{ '@type': 'ListItem', position: 3, name: p.categoryName, item: abs('/collection.html?category=' + p.category) }] : []),
      { '@type': 'ListItem', position: p.categoryName ? 4 : 3, name: p.title, item: url },
    ],
  };

  const head = `
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <link rel="canonical" href="${htmlEscape(url)}" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${htmlEscape(p.title)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:image" content="${htmlEscape(image)}" />
  <meta property="og:url" content="${htmlEscape(url)}" />
  <meta property="product:price:amount" content="${(p.priceCents / 100).toFixed(2)}" />
  <meta property="product:price:currency" content="${config.store.currency}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(p.title)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
  <meta name="twitter:image" content="${htmlEscape(image)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
`;

  // Replace the default <title> and inject the meta block before </head>.
  html = html.replace(/<title>[\s\S]*?<\/title>/, '').replace('</head>', head + '</head>');
  res.type('html').set('Cache-Control', 'public, max-age=300').send(html);
}

module.exports = { router, productMeta };
