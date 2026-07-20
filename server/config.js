'use strict';
/**
 * Central configuration. Reads from environment (.env) with safe
 * development defaults so the app runs with zero external credentials.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const bool = (v, d = false) => (v == null ? d : /^(1|true|yes|on)$/i.test(String(v)));

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  appUrl: (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, ''),

  paths: {
    root: ROOT,
    public: path.join(ROOT, 'public'),
    uploads: path.join(ROOT, 'uploads'),
    data: path.join(ROOT, 'data'),
    db: path.join(ROOT, 'data', 'loomipaw.db'),
    logs: path.join(ROOT, 'var', 'logs'),
    mail: path.join(ROOT, 'var', 'mail'),
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-change-me-to-a-long-random-secret',
    sessionCookie: process.env.SESSION_COOKIE || 'lp_session',
    csrfCookie: 'lp_csrf',
    jwtExpiresIn: '7d',
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',').map((s) => s.trim()).filter(Boolean),
  },

  store: {
    name: process.env.STORE_NAME || 'Loomipaw',
    currency: process.env.STORE_CURRENCY || 'USD',
    email: process.env.STORE_EMAIL || 'hello@loomipaw.com',
  },

  payments: {
    provider: (process.env.PAYMENT_PROVIDER || 'dev').toLowerCase(),
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
  },

  mail: {
    transport: (process.env.MAIL_TRANSPORT || 'dev').toLowerCase(),
    from: process.env.MAIL_FROM || 'Loomipaw <hello@loomipaw.com>',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: bool(process.env.SMTP_SECURE, false),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@loomipaw.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123!change',
  },

  // Marketing / analytics tags. All optional — empty means "not installed",
  // and the loader simply skips it (no vendor script, no CSP relaxation).
  analytics: {
    ga4: (process.env.GA4_MEASUREMENT_ID || '').trim(),          // e.g. G-XXXXXXXXXX
    metaPixel: (process.env.META_PIXEL_ID || '').trim(),         // e.g. 1234567890
    tiktokPixel: (process.env.TIKTOK_PIXEL_ID || '').trim(),     // e.g. C9XXXXXXXXXXXXXXXX
    clarity: (process.env.CLARITY_PROJECT_ID || '').trim(),      // e.g. abcdef1234
  },
};

module.exports = config;
