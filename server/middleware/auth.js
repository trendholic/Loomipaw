'use strict';
/** JWT auth via httpOnly cookie. Attaches req.user when a valid token exists. */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { HttpError } = require('../lib/util');

function sign(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, tv: user.token_version || 0 },
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

// Populates req.user if a valid, non-revoked session cookie is present.
// Sessions are invalidated when token_version is bumped (e.g. password change).
function attachUser(req, res, next) {
  const token = req.cookies?.[config.security.sessionCookie];
  if (token) {
    try {
      const payload = jwt.verify(token, config.security.jwtSecret);
      const user = db.prepare('SELECT id, email, name, role, phone, address_json, token_version, locked_until, created_at FROM users WHERE id = ?').get(payload.sub);
      if (user && (payload.tv || 0) === (user.token_version || 0) && !isLocked(user)) {
        req.user = user;
      } else if (user) {
        clearAuthCookie(res); // stale/revoked token — drop it
      }
    } catch (_) { /* invalid/expired token → treated as guest */ }
  }
  next();
}

function isLocked(user) {
  if (!user.locked_until) return false;
  const until = new Date(user.locked_until.includes('T') ? user.locked_until : user.locked_until.replace(' ', 'T') + 'Z');
  return until.getTime() > Date.now();
}

function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  next();
}

// Staff and admin both pass; use requireAdmin for owner-only actions.
function requireStaff(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  if (req.user.role !== 'admin' && req.user.role !== 'staff') throw new HttpError(403, 'Staff access required');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  if (req.user.role !== 'admin') throw new HttpError(403, 'Admin access required');
  next();
}

module.exports = { sign, setAuthCookie, clearAuthCookie, attachUser, requireAuth, requireStaff, requireAdmin };
