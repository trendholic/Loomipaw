'use strict';
/** Unit tests for pure business logic (node:test — no server required). */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { money, slugify, orderNumber } = require('../lib/util');
const { toCsv } = require('../lib/csv');
const sec = require('../services/accountSecurity');
const coupons = require('../services/coupons');

test('money helpers convert correctly', () => {
  assert.equal(money.toCents(19.99), 1999);
  assert.equal(money.toCents(0.1), 10);
  assert.equal(money.fromCents(1999), 19.99);
  assert.match(money.format(1999, 'USD'), /\$19\.99/);
});

test('slugify normalizes titles', () => {
  assert.equal(slugify('Aspen Merino Knit'), 'aspen-merino-knit');
  assert.equal(slugify('  Beds & Comfort!! '), 'beds-comfort');
  assert.equal(slugify('Héllo—World'), 'hlloworld'.replace('hllo', 'hllo')); // accents stripped
});

test('orderNumber has the LP- prefix and is unique-ish', () => {
  const a = orderNumber(), b = orderNumber();
  assert.match(a, /^LP-[0-9A-F]{8}$/);
  assert.notEqual(a, b);
});

test('password policy accepts strong, rejects weak', () => {
  assert.equal(sec.checkPasswordStrength('Str0ng!Pass9').ok, true);
  assert.equal(sec.checkPasswordStrength('short').ok, false);          // too short
  assert.equal(sec.checkPasswordStrength('alllowercase').ok, false);   // one class
  assert.equal(sec.checkPasswordStrength('aaaaaaaaaaaa').ok, false);    // repeated
  assert.equal(sec.checkPasswordStrength('Password12').ok, true);      // 3 classes
});

test('coupon discount computes percent and fixed with caps', () => {
  assert.equal(coupons.discountFor({ type: 'percent', value: 10 }, 10000), 1000);
  assert.equal(coupons.discountFor({ type: 'fixed', value: 1500 }, 10000), 1500);
  // fixed discount never exceeds subtotal
  assert.equal(coupons.discountFor({ type: 'fixed', value: 99999 }, 5000), 5000);
  // percent rounds to nearest cent
  assert.equal(coupons.discountFor({ type: 'percent', value: 15 }, 3333), Math.round(3333 * 0.15));
});

test('CSV serializer quotes correctly (RFC-4180)', () => {
  const csv = toCsv(['a', 'b'], [['plain', 'has,comma'], ['line\nbreak', 'quote"mark']]);
  const lines = csv.replace('﻿', '').split('\r\n');
  assert.equal(lines[0], 'a,b');
  assert.equal(lines[1], 'plain,"has,comma"');
  assert.equal(lines[2], '"line\nbreak","quote""mark"');
});
