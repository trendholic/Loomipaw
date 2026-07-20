'use strict';
/** Runtime store settings, persisted in the `settings` table with defaults. */
const db = require('../db');
const config = require('../config');

const DEFAULTS = {
  store: {
    name: config.store.name,
    email: config.store.email,
    currency: config.store.currency,
    phone: '+1 (555) 010-2665',
    address: '148 Aspen Row, Portland, OR',
    announcement: 'Complimentary carbon-neutral shipping over $75',
  },
  shipping: {
    freeThresholdCents: 7500,
    methods: [
      { id: 'standard', label: 'Standard (3–5 days)', priceCents: 600 },
      { id: 'express', label: 'Express (1–2 days)', priceCents: 1500 },
    ],
  },
  tax: {
    // Simple destination-agnostic rate; per-region overrides by 2-letter code.
    ratePercent: 8.5,
    includedInPrice: false,
    regions: {}, // e.g. { "OR": 0, "CA": 9.5 }
  },
  payments: {
    provider: config.payments.provider,
  },
};

// In-process cache — settings change rarely but are read on nearly every
// request (cart pricing, storefront bootstrap). Invalidated on write.
const cache = new Map();

function get(key) {
  if (cache.has(key)) return cache.get(key);
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  let value = DEFAULTS[key];
  if (row) { try { value = JSON.parse(row.value); } catch { value = DEFAULTS[key]; } }
  cache.set(key, value);
  return value;
}

function set(key, value) {
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
    .run(key, JSON.stringify(value));
  cache.set(key, value);
  return value;
}

function invalidate() { cache.clear(); }

function all() {
  return {
    store: get('store'),
    shipping: get('shipping'),
    tax: get('tax'),
    payments: get('payments'),
  };
}

module.exports = { get, set, all, invalidate, DEFAULTS };
