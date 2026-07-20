'use strict';
/**
 * Startup environment validation.
 *
 * In production this refuses to boot with dangerous defaults (a known
 * JWT_SECRET or admin password) and hard-fails when a selected integration is
 * missing its credentials. It emits clear WARN lines for softer issues (e.g.
 * the simulated payment/mail provider still being active in production).
 *
 * In development it only prints advisory notes and never exits.
 */
const config = require('../config');

const DEFAULT_JWT = 'dev-change-me-to-a-long-random-secret';
const DEFAULT_ADMIN_PW = 'Admin123!change';

function collect() {
  const errors = [];   // block boot in production
  const warns = [];    // advisory
  const c = config;
  const prod = c.isProd;

  // --- Secrets ---
  if (!c.security.jwtSecret || c.security.jwtSecret === DEFAULT_JWT) {
    (prod ? errors : warns).push('JWT_SECRET is unset or the insecure default — set a long random value (openssl rand -base64 48).');
  } else if (c.security.jwtSecret.length < 32) {
    (prod ? errors : warns).push('JWT_SECRET is shorter than 32 characters — use a longer secret.');
  }
  if (c.admin.password === DEFAULT_ADMIN_PW) {
    (prod ? errors : warns).push('ADMIN_PASSWORD is the seeded default — change it before launch.');
  }

  // --- Core ---
  if (prod && !/^https:\/\//i.test(c.appUrl)) {
    warns.push(`APP_URL should be your public https:// URL in production (currently "${c.appUrl}").`);
  }

  // --- Payments ---
  const provider = c.payments.provider;
  if (prod && provider === 'dev') {
    warns.push('PAYMENT_PROVIDER=dev (simulated payments) is active in PRODUCTION — set stripe or paypal before accepting real orders.');
  }
  if (provider === 'stripe') {
    if (!c.payments.stripe.secretKey) errors.push('PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is missing.');
    if (prod && !c.payments.stripe.webhookSecret) warns.push('STRIPE_WEBHOOK_SECRET is unset — webhook confirmation/refund reconciliation will not work.');
    if (prod && /sk_test_/.test(c.payments.stripe.secretKey || '')) warns.push('STRIPE_SECRET_KEY is a TEST key (sk_test_…) in production.');
  }
  if (provider === 'paypal') {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) errors.push('PAYMENT_PROVIDER=paypal but PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are missing.');
    if (prod && process.env.PAYPAL_ENV !== 'live') warns.push('PAYPAL_ENV is not "live" in production.');
    if (prod && !process.env.PAYPAL_WEBHOOK_ID) warns.push('PAYPAL_WEBHOOK_ID is unset — webhook verification will not work.');
  }

  // --- Email ---
  if (c.mail.transport === 'smtp') {
    if (!c.mail.smtp.host) errors.push('MAIL_TRANSPORT=smtp but SMTP_HOST is missing.');
  } else if (prod) {
    warns.push('MAIL_TRANSPORT=dev in production — emails are written to var/mail/*.eml and NOT delivered. Set SMTP for real delivery.');
  }

  return { errors, warns, prod };
}

/**
 * @param {{exitOnError?:boolean}} opts
 * @returns {{ok:boolean, errors:string[], warns:string[]}}
 */
function validateEnv({ exitOnError = true } = {}) {
  const logger = require('./logger');
  const { errors, warns, prod } = collect();

  for (const w of warns) logger.warn('env: ' + w);
  for (const e of errors) logger.error('env: ' + e);

  if (errors.length) {
    // eslint-disable-next-line no-console
    console.error(`\n  ✗ ${errors.length} production configuration error(s):\n` + errors.map((e) => '    • ' + e).join('\n') + '\n');
    if (prod && exitOnError) {
      console.error('  Refusing to start in production with insecure configuration. Fix the above in your .env.\n');
      process.exit(1);
    }
  } else if (warns.length) {
    // eslint-disable-next-line no-console
    console.warn(`\n  ⚠ ${warns.length} configuration warning(s) — see logs above.\n`);
  } else {
    // eslint-disable-next-line no-console
    console.log('  ✓ Environment configuration looks good.');
  }
  return { ok: errors.length === 0, errors, warns };
}

module.exports = validateEnv;
module.exports.collect = collect;
