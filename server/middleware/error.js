'use strict';
const logger = require('../lib/logger');
const config = require('../config');

// 404 for unmatched API routes.
function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found', path: req.path });
  }
  next();
}

// Central error handler. Never leaks internals in production.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  } else {
    logger.warn(err.message, { path: req.path, status });
  }
  const body = { error: err.expose || status < 500 ? err.message : 'Internal server error' };
  if (err.details) body.details = err.details;
  if (!config.isProd && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
