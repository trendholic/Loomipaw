'use strict';
/** Append-only audit trail. Never throws into the request path. */
const db = require('../db');
const logger = require('../lib/logger');

const insert = db.prepare(`INSERT INTO audit_log (actor_id, actor_email, action, entity, ip, user_agent, meta_json)
                           VALUES (@actor_id, @actor_email, @action, @entity, @ip, @user_agent, @meta_json)`);

/**
 * @param {object} req  Express request (for actor + ip + UA)
 * @param {string} action  dot-namespaced action, e.g. 'auth.login'
 * @param {string} entity  optional target, e.g. 'order:LP-1234'
 * @param {object} meta    optional structured detail
 */
function log(req, action, entity = '', meta = {}) {
  try {
    insert.run({
      actor_id: req?.user?.id || null,
      actor_email: req?.user?.email || meta.email || '',
      action,
      entity,
      ip: clientIp(req),
      user_agent: (req?.get?.('user-agent') || '').slice(0, 300),
      meta_json: JSON.stringify(scrub(meta)),
    });
  } catch (err) {
    logger.warn('audit log failed', { action, error: err.message });
  }
}

function clientIp(req) {
  if (!req) return '';
  return (req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket?.remoteAddress || '';
}

// Never persist secrets in the audit meta.
const REDACT = new Set(['password', 'current', 'cardNumber', 'cvc', 'token', 'password_hash']);
function scrub(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = REDACT.has(k) ? '[redacted]' : v;
  return out;
}

function list({ limit = 100, offset = 0, action } = {}) {
  if (action) return db.prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(action, limit, offset);
  return db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
}

module.exports = { log, list, clientIp };
