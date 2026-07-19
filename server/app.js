'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const logger = require('./lib/logger');
const { attachUser } = require('./middleware/auth');
const { issueCsrf, verifyCsrf } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security headers (CSP tuned for our self-hosted assets + Google Fonts) ---
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // --- Parsers ---
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // --- Request logging (skip static assets) ---
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      const start = Date.now();
      res.on('finish', () => logger.debug('request', { m: req.method, p: req.path, s: res.statusCode, ms: Date.now() - start }));
    }
    next();
  });

  // --- Session + CSRF context on every request ---
  app.use(attachUser);
  app.use(issueCsrf);

  // --- Health ---
  app.get('/api/health', (req, res) => res.json({ ok: true, name: config.store.name, time: new Date().toISOString() }));

  // --- API (rate-limited + CSRF-protected mutations) ---
  const api = express.Router();
  api.use(apiLimiter);
  api.use(verifyCsrf);
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

  // --- Static assets ---
  const staticOpts = { maxAge: config.isProd ? '7d' : 0, etag: true };
  app.use('/uploads', express.static(config.paths.uploads, { maxAge: config.isProd ? '30d' : 0 }));
  app.use(express.static(config.paths.public, { ...staticOpts, extensions: ['html'] }));

  // --- Pretty routes for SPA-ish pages (serve .html without extension) ---
  app.get(['/', '/shop', '/product', '/cart', '/checkout', '/account', '/admin', '/contact'], (req, res, next) => {
    // handled by static extensions + specific files; fall through otherwise
    next();
  });

  app.use(notFound);
  // Client-side 404 for non-API unmatched paths → friendly page
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
