'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { asyncHandler, HttpError, randomToken } = require('../lib/util');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const auth = require('../middleware/auth');
const cart = require('../services/cart');
const sec = require('../services/accountSecurity');
const audit = require('../services/audit');
const mailer = require('../lib/mailer');
const config = require('../config');
const logger = require('../lib/logger');

const router = express.Router();

const emailField = z.string().trim().toLowerCase().email('Enter a valid email');
// Strong password policy enforced via refinement (>=10 chars, 3+ classes).
const passwordField = z.string().superRefine((val, ctx) => {
  const res = sec.checkPasswordStrength(val);
  if (!res.ok) ctx.addIssue({ code: 'custom', message: res.message });
});

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone || '', address: safeJson(u.address_json) });
const safeJson = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
const BCRYPT_COST = 12;

// --- Register ---
router.post('/register', authLimiter,
  validate({ body: z.object({ name: z.string().trim().min(1, 'Name is required').max(120), email: emailField, password: passwordField }) }),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) throw new HttpError(409, 'An account with this email already exists');
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const info = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, name);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

    auth.setAuthCookie(res, auth.sign(user));
    if (req.cookies?.lp_cart) cart.mergeGuestIntoUser(req.cookies.lp_cart, user.id);
    audit.log(req, 'auth.register', `user:${user.id}`, { email });
    mailer.sendWelcome(user).catch((e) => logger.warn('welcome email failed', { e: e.message }));
    res.status(201).json({ user: publicUser(user) });
  }));

// --- Login (with brute-force lockout) ---
router.post('/login', authLimiter,
  validate({ body: z.object({ email: emailField, password: z.string().min(1, 'Password is required').max(200) }) }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ip = audit.clientIp(req);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // IP/identifier-level throttle (independent of account existence).
    if (sec.tooManyRecentFailures(email)) {
      audit.log(req, 'auth.login.throttled', '', { email });
      throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
    }
    if (user && sec.isLocked(user)) {
      const mins = Math.ceil(sec.lockRemainingSeconds(user) / 60);
      audit.log(req, 'auth.login.locked', `user:${user.id}`, { email });
      throw new HttpError(423, `Account temporarily locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
    }

    // Constant-work comparison to resist user enumeration & timing.
    const hash = user ? user.password_hash : '$2a$12$0000000000000000000000000000000000000000000000000000';
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok) {
      sec.registerFailure(user, email, ip);
      audit.log(req, 'auth.login.failure', user ? `user:${user.id}` : '', { email });
      throw new HttpError(401, 'Invalid email or password');
    }

    sec.registerSuccess(user, email, ip);
    auth.setAuthCookie(res, auth.sign(user));
    if (req.cookies?.lp_cart) cart.mergeGuestIntoUser(req.cookies.lp_cart, user.id);
    audit.log(req, 'auth.login.success', `user:${user.id}`, { email });
    res.json({ user: publicUser(user) });
  }));

// --- Logout ---
router.post('/logout', (req, res) => {
  if (req.user) audit.log(req, 'auth.logout', `user:${req.user.id}`);
  auth.clearAuthCookie(res);
  res.json({ ok: true });
});

// --- Current user ---
router.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) : null });
});

// --- Update profile ---
router.patch('/me', auth.requireAuth,
  validate({ body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    address: z.object({
      address1: z.string().max(200).optional(), address2: z.string().max(200).optional(),
      city: z.string().max(120).optional(), region: z.string().max(120).optional(),
      postal: z.string().max(40).optional(), country: z.string().max(120).optional(),
    }).partial().optional(),
  }) }),
  asyncHandler(async (req, res) => {
    const { name, phone, address } = req.body;
    const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    db.prepare("UPDATE users SET name = ?, phone = ?, address_json = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name ?? cur.name, phone ?? cur.phone, JSON.stringify(address ?? safeJson(cur.address_json)), req.user.id);
    audit.log(req, 'account.profile.update', `user:${req.user.id}`);
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  }));

// --- Change password (revokes other sessions) ---
router.post('/change-password', auth.requireAuth, authLimiter,
  validate({ body: z.object({ current: z.string().min(1).max(200), password: passwordField }) }),
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(req.body.current, user.password_hash);
    if (!ok) { audit.log(req, 'account.password.change.failure', `user:${user.id}`); throw new HttpError(400, 'Current password is incorrect'); }
    const hash = await bcrypt.hash(req.body.password, BCRYPT_COST);
    db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
    // Re-issue a session for the current device so the user stays logged in here.
    auth.setAuthCookie(res, auth.sign(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)));
    audit.log(req, 'account.password.change', `user:${user.id}`);
    res.json({ ok: true });
  }));

// --- Request password reset ---
router.post('/forgot-password', authLimiter,
  validate({ body: z.object({ email: emailField }) }),
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);
    if (user) {
      const token = randomToken(32);
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expires, user.id);
      const url = `${config.appUrl}/account/reset.html?token=${token}`;
      audit.log(req, 'auth.password.reset.request', `user:${user.id}`, { email: req.body.email });
      mailer.sendPasswordReset(user, url).catch((e) => logger.warn('reset email failed', { e: e.message }));
    }
    res.json({ ok: true, message: 'If an account exists, a reset link has been sent.' }); // no enumeration
  }));

// --- Perform password reset (revokes all sessions) ---
router.post('/reset-password', authLimiter,
  validate({ body: z.object({ token: z.string().min(10).max(200), password: passwordField }) }),
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(req.body.token);
    if (!user || !user.reset_expires || user.reset_expires < new Date().toISOString()) {
      throw new HttpError(400, 'This reset link is invalid or has expired');
    }
    const hash = await bcrypt.hash(req.body.password, BCRYPT_COST);
    db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, token_version = token_version + 1, failed_logins = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
    audit.log(req, 'auth.password.reset.complete', `user:${user.id}`);
    res.json({ ok: true });
  }));

module.exports = router;
