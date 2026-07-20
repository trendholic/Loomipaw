'use strict';
/**
 * Brute-force defence: records login attempts, enforces a progressive
 * account lockout, and exposes a reusable password-strength policy.
 */
const db = require('../db');

const MAX_FAILS = 5;              // consecutive failures before lockout
const LOCK_MINUTES = 15;         // lockout duration
const ATTEMPT_WINDOW_MIN = 15;   // window for per-identifier IP throttling

const q = {
  recordAttempt: db.prepare('INSERT INTO login_attempts (identifier, success, ip) VALUES (?, ?, ?)'),
  recentFails: db.prepare(`SELECT COUNT(*) n FROM login_attempts
                           WHERE identifier = ? AND success = 0 AND created_at >= datetime('now', ?)`),
  bumpUserFail: db.prepare('UPDATE users SET failed_logins = failed_logins + 1 WHERE id = ?'),
  lockUser: db.prepare("UPDATE users SET locked_until = datetime('now', ?), failed_logins = failed_logins WHERE id = ?"),
  resetUser: db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?"),
};

// SQLite datetime('now') → "YYYY-MM-DD HH:MM:SS" (UTC). Normalize to a Date.
function parseUTC(s) {
  if (!s) return null;
  return new Date(s.includes('T') ? (s.endsWith('Z') ? s : s + 'Z') : s.replace(' ', 'T') + 'Z');
}

function isLocked(user) {
  if (!user || !user.locked_until) return false;
  const until = parseUTC(user.locked_until);
  return until != null && until.getTime() > Date.now();
}

function lockRemainingSeconds(user) {
  if (!isLocked(user)) return 0;
  return Math.max(0, Math.ceil((parseUTC(user.locked_until).getTime() - Date.now()) / 1000));
}

// Call after a failed attempt. Locks the user once the threshold is crossed.
function registerFailure(user, identifier, ip) {
  q.recordAttempt.run(identifier, 0, ip || '');
  if (user) {
    q.bumpUserFail.run(user.id);
    const fails = (user.failed_logins || 0) + 1;
    if (fails >= MAX_FAILS) q.lockUser.run(`+${LOCK_MINUTES} minutes`, user.id);
  }
}

function registerSuccess(user, identifier, ip) {
  q.recordAttempt.run(identifier, 1, ip || '');
  if (user) q.resetUser.run(user.id);
}

// IP-level guard independent of whether the account exists (anti-enumeration).
function tooManyRecentFailures(identifier) {
  const n = q.recentFails.get(identifier, `-${ATTEMPT_WINDOW_MIN} minutes`).n;
  return n >= MAX_FAILS * 3;
}

/**
 * Password policy: >= 10 chars with at least 3 of 4 character classes.
 * Returns { ok, message }.
 */
function checkPasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return { ok: false, message: 'Password must be at least 10 characters.' };
  if (pw.length > 200) return { ok: false, message: 'Password is too long.' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 3) return { ok: false, message: 'Use at least 3 of: lowercase, uppercase, numbers, symbols.' };
  if (/^(.)\1+$/.test(pw)) return { ok: false, message: 'Password is too weak.' };
  return { ok: true };
}

module.exports = {
  MAX_FAILS, LOCK_MINUTES,
  isLocked, lockRemainingSeconds, registerFailure, registerSuccess, tooManyRecentFailures, checkPasswordStrength,
};
