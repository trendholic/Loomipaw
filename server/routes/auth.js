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
const mailer = require('../lib/mailer');
const config = require('../config');
const logger = require('../lib/logger');

const router = express.Router();

const emailField = z.string().trim().toLowerCase().email('Enter a valid email');
const passwordField = z.string().min(8, 'Password must be at least 8 characters').max(200);

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone || '', address: safeJson(u.address_json) });
const safeJson = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

// --- Register ---
router.post('/register', authLimiter,
  validate({ body: z.object({ name: z.string().trim().min(1, 'Name is required').max(120), email: emailField, password: passwordField }) }),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) throw new HttpError(409, 'An account with this email already exists');
    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, name);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

    const token = auth.sign(user);
    auth.setAuthCookie(res, token);
    if (req.cookies?.lp_cart) cart.mergeGuestIntoUser(req.cookies.lp_cart, user.id);
    mailer.sendWelcome(user).catch((e) => logger.warn('welcome email failed', { e: e.message }));
    res.status(201).json({ user: publicUser(user) });
  }));

// --- Login ---
router.post('/login', authLimiter,
  validate({ body: z.object({ email: emailField, password: z.string().min(1, 'Password is required') }) }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Constant-ish work whether or not the user exists.
    const hash = user ? user.password_hash : '$2a$12$0000000000000000000000000000000000000000000000000000';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) throw new HttpError(401, 'Invalid email or password');

    const token = auth.sign(user);
    auth.setAuthCookie(res, token);
    if (req.cookies?.lp_cart) cart.mergeGuestIntoUser(req.cookies.lp_cart, user.id);
    res.json({ user: publicUser(user) });
  }));

// --- Logout ---
router.post('/logout', (req, res) => {
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
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  }));

// --- Change password (authenticated) ---
router.post('/change-password', auth.requireAuth, authLimiter,
  validate({ body: z.object({ current: z.string().min(1), password: passwordField }) }),
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(req.body.current, user.password_hash);
    if (!ok) throw new HttpError(400, 'Current password is incorrect');
    const hash = await bcrypt.hash(req.body.password, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
    res.json({ ok: true });
  }));

// --- Request password reset ---
router.post('/forgot-password', authLimiter,
  validate({ body: z.object({ email: emailField }) }),
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);
    if (user) {
      const token = randomToken(24);
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expires, user.id);
      const url = `${config.appUrl}/account/reset.html?token=${token}`;
      mailer.sendPasswordReset(user, url).catch((e) => logger.warn('reset email failed', { e: e.message }));
    }
    // Always 200 to avoid account enumeration.
    res.json({ ok: true, message: 'If an account exists, a reset link has been sent.' });
  }));

// --- Perform password reset ---
router.post('/reset-password', authLimiter,
  validate({ body: z.object({ token: z.string().min(10), password: passwordField }) }),
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(req.body.token);
    if (!user || !user.reset_expires || user.reset_expires < new Date().toISOString()) {
      throw new HttpError(400, 'This reset link is invalid or has expired');
    }
    const hash = await bcrypt.hash(req.body.password, 12);
    db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
    res.json({ ok: true });
  }));

module.exports = router;
