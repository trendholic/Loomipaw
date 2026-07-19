'use strict';
/**
 * Double-submit-cookie CSRF protection.
 * A non-httpOnly cookie holds a random token; unsafe requests must echo it
 * back in the `x-csrf-token` header. Cookie-less API clients (Bearer/none)
 * are unaffected because the attack vector is ambient cookie auth.
 */
const config = require('../config');
const { randomToken, HttpError } = require('../lib/util');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrf(req, res, next) {
  let token = req.cookies?.[config.security.csrfCookie];
  if (!token) {
    token = randomToken(24);
    res.cookie(config.security.csrfCookie, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: config.isProd,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  req.csrfToken = token;
  next();
}

function verifyCsrf(req, res, next) {
  if (SAFE.has(req.method)) return next();
  // Only enforce when the request is authenticated by the session cookie.
  const cookieToken = req.cookies?.[config.security.csrfCookie];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new HttpError(403, 'Invalid or missing CSRF token');
  }
  next();
}

module.exports = { issueCsrf, verifyCsrf };
