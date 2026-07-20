'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config');
const logger = require('./lib/logger');
const audit = require('./services/audit');
const { attachUser } = require('./middleware/auth');
const { issueCsrf, verifyCsrf } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');
const seo = require('./routes/seo');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.set('etag', 'strong');
  app.disable('x-powered-by');

  // --- Response compression (gzip/brotli-aware) ---
  app.use(compression({ threshold: 1024 }));

  // --- Security headers ---
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: config.isProd ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  }));
  // Permissions-Policy: disable powerful features we never use.
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()');
    next();
  });

  // --- Parsers ---
  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ extended: true, limit: '512kb' }));
  app.use(cookieParser());

  // --- Request logging + timing (API only) ---
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        res.setHeader && res.headersSent;
        logger.debug('request', { m: req.method, p: req.path, s: res.statusCode, ms: Math.round(ms) });
      });
    }
    next();
  });

  // --- Session + CSRF context on every request ---
  app.use(attachUser);
  app.use(issueCsrf);

  // --- Health ---
  app.get('/api/health', (req, res) => res.json({ ok: true, name: config.store.name, time: new Date().toISOString() }));

  // --- SEO endpoints (robots, sitemap) — before static so they're dynamic ---
  app.use('/', seo.router);

  // --- API (rate-limited + CSRF-protected mutations) ---
  const api = express.Router();
  api.use(apiLimiter);
  api.use(verifyCsrf);
  // Audit trail for every admin mutation.
  api.use('/admin', (req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => { if (res.statusCode < 400) audit.log(req, `admin.${req.method.toLowerCase()}`, req.path); });
    }
    next();
  });
  api.use('/auth', require('./routes/auth'));
  api.use('/products', require('./routes/products'));
  api.use('/', require('./routes/misc'));            // categories, search, settings, newsletter, contact
  api.use('/cart', require('./routes/cart'));
  api.use('/reviews', require('./routes/reviews').router);
  api.use('/wishlist', require('./routes/wishlist'));
  api.use('/checkout', require('./routes/checkout'));
  api.use('/orders', require('./routes/orders'));
  api.use('/admin', require('./routes/admin'));
  app.use('/api', api);

  // --- Server-rendered SEO meta for product pages (crawler-friendly) ---
  app.get('/product.html', seo.productMeta);

  // --- Static assets ---
  // Uploaded, content-addressed images are safe to cache aggressively.
  app.use('/uploads', express.static(config.paths.uploads, {
    maxAge: config.isProd ? '365d' : 0, immutable: config.isProd, etag: true,
  }));
  // Hashed-ish site assets: moderate cache; HTML: revalidate.
  app.use(express.static(config.paths.public, {
    etag: true,
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (/\.(css|js|webp|jpg|jpeg|png|svg|woff2?)$/.test(filePath)) {
        res.setHeader('Cache-Control', config.isProd ? 'public, max-age=604800' : 'no-cache');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));

  app.use(notFound);
  // Friendly HTML 404 for unmatched non-API GETs.
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && req.accepts('html')) {
      return res.status(404).sendFile(path.join(config.paths.public, '404.html'), (err) => { if (err) next(); });
    }
    next();
  });

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
