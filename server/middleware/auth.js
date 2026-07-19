'use strict';
/** JWT auth via httpOnly cookie. Attaches req.user when a valid token exists. */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { HttpError } = require('../lib/util');

function sign(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.security.jwtSecret,
    { expiresIn: config.security.jwtExpiresIn }
  );
}

function setAuthCookie(res, token) {
  res.cookie(config.security.sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(config.security.sessionCookie, { path: '/' });
}

// Populates req.user if a valid session cookie is present (never throws).
function attachUser(req, res, next) {
  const token = req.cookies?.[config.security.sessionCookie];
  if (token) {
    try {
      const payload = jwt.verify(token, config.security.jwtSecret);
      const user = db.prepare('SELECT id, email, name, role, phone, address_json, created_at FROM users WHERE id = ?').get(payload.sub);
      if (user) req.user = user;
    } catch (_) { /* invalid/expired token → treated as guest */ }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  if (req.user.role !== 'admin') throw new HttpError(403, 'Admin access required');
  next();
}

module.exports = { sign, setAuthCookie, clearAuthCookie, attachUser, requireAuth, requireAdmin };
