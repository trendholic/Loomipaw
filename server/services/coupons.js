'use strict';
/** Coupon validation + discount computation. */
const db = require('../db');

function find(code) {
  if (!code) return null;
  return db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(String(code).trim());
}

/**
 * Validate a coupon against a subtotal (in cents).
 * @returns {{ok:boolean, reason?:string, coupon?:object}}
 */
function validate(code, subtotalCents) {
  const coupon = find(code);
  if (!coupon) return { ok: false, reason: 'Coupon not found' };
  if (!coupon.active) return { ok: false, reason: 'This coupon is no longer active' };
  const now = new Date().toISOString();
  if (coupon.starts_at && coupon.starts_at > now) return { ok: false, reason: 'This coupon is not active yet' };
  if (coupon.ends_at && coupon.ends_at < now) return { ok: false, reason: 'This coupon has expired' };
  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) return { ok: false, reason: 'This coupon has reached its usage limit' };
  if (subtotalCents < coupon.min_subtotal_cents) {
    return { ok: false, reason: `Spend at least ${(coupon.min_subtotal_cents / 100).toFixed(2)} to use this coupon` };
  }
  return { ok: true, coupon };
}

/** Discount amount in cents for a valid coupon + subtotal. */
function discountFor(coupon, subtotalCents) {
  if (!coupon) return 0;
  if (coupon.type === 'percent') {
    return Math.min(subtotalCents, Math.round(subtotalCents * (coupon.value / 100)));
  }
  return Math.min(subtotalCents, coupon.value); // fixed, in cents
}

function incrementUsage(code) {
  db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ? COLLATE NOCASE').run(code);
}

module.exports = { find, validate, discountFor, incrementUsage };
