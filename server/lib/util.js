'use strict';
/** Small shared helpers used across routes and services. */

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

// Wrap async route handlers so thrown errors reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const money = {
  toCents: (v) => Math.round(Number(v) * 100),
  fromCents: (c) => Number((c / 100).toFixed(2)),
  format: (c, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(c / 100),
};

function slugify(str) {
  return String(str)
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Cryptographically strong random id (URL-safe).
const crypto = require('crypto');
function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

// Human order number, e.g. LP-2K7Q9X4
function orderNumber() {
  return 'LP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

module.exports = { HttpError, asyncHandler, money, slugify, randomToken, orderNumber };
