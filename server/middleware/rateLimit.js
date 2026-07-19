'use strict';
const rateLimit = require('express-rate-limit');

const json = (req, res) => res.status(429).json({ error: 'Too many requests, please slow down.' });

// General API limiter — generous.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});

// Strict limiter for auth & other sensitive mutations.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});

// Checkout / write-heavy endpoints.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});

module.exports = { apiLimiter, authLimiter, writeLimiter };
