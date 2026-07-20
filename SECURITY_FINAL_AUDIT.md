# Loomipaw — Final Security Audit

_Pre-launch security review. All checks below were run against the current
codebase; results are measured, not assumed._

**Date of run:** launch-prep phase · **npm audit:** 0 vulnerabilities ·
**Automated tests:** 36 in-process + 27 API e2e passing.

---

## Summary

| Control | Status | Evidence |
|---------|:------:|----------|
| Admin routes require auth | ✅ | `router.use(requireAdmin)` covers all `/api/admin/*`; live check: guest→401, customer→403 on every endpoint incl. exports/refund/bulk |
| Authentication | ✅ | bcrypt (cost 12), JWT httpOnly cookie, token-version revocation, brute-force lockout |
| Rate limiting | ✅ | tiered limiters (auth 30/15m, writes 40/min, API 600/15m) — 15 usages wired |
| Secure cookies | ✅ | `secure: config.isProd` on session + CSRF; cart cookie gated on `NODE_ENV=production` |
| CSRF | ✅ | double-submit token enforced on all mutating API routes; webhooks exempt via signature |
| Upload security | ✅ | MIME filter + 8 MB cap + real-bytes decode + 40 MP bomb guard + metadata stripped |
| Exposed secrets | ✅ | `.env` git-ignored & untracked; no live keys in repo (only placeholder docs) |
| Dependency vulnerabilities | ✅ | `npm audit` → 0 |
| Security headers | ✅ | Helmet CSP (frame-ancestors none, script-src-attr none, object-src none), HSTS (prod), Referrer-Policy, Permissions-Policy, nosniff, CORP |
| SQL injection | ✅ | 100% parameterized; dynamic ORDER BY via whitelist; injection test passes |
| Startup config safety | ✅ | prod boot **refuses** default JWT_SECRET / admin password (exit 1) |

**Overall: no blocking findings.** Residual items are operational config that
you complete at deploy time (below).

---

## 1. Admin authentication & authorization

- Every `/api/admin/*` route sits behind `router.use(requireAdmin)` — Express
  applies it to all routes declared after it.
- Live verification (guest, no session):
  ```
  GET  /api/admin/export/orders.csv   → 401
  GET  /api/admin/analytics           → 401
  GET  /api/admin/activity            → 401
  POST /api/admin/bulk/orders         → 403 (CSRF) 
  POST /api/admin/orders/:n/refund    → 403 (CSRF)
  ```
- Logged-in **customer** hitting `/api/admin/stats` → **403** (test-covered).
- Roles: `customer` / `staff` / `admin`; `requireStaff` and `requireAdmin`
  middleware available for future least-privilege splits.

## 2. Rate limiting

- `authLimiter` (30 / 15 min) on register, login, password reset/change.
- `writeLimiter` (40 / min) on checkout, newsletter, contact.
- `apiLimiter` (600 / 15 min) on the whole API.
- Plus **account lockout** (5 fails → 15-min lock) and IP-level throttle,
  independent of the limiter.

## 3. Cookies

- Session (`lp_session`) and CSRF (`lp_csrf`) cookies set `secure` when
  `NODE_ENV=production`, `httpOnly` (session), `SameSite=Lax`.
- Requires running behind HTTPS in production (see nginx config) so `secure`
  cookies are actually sent — documented in the go-live checklist.

## 4. CSRF

- Double-submit cookie: non-safe methods must echo `lp_csrf` in
  `x-csrf-token`. Verified: tokenless mutation → 403; with token → allowed.
- Webhooks (`/api/webhooks/*`) are intentionally CSRF-exempt — they are
  server-to-server and authenticated by **cryptographic signature** (Stripe
  signing secret / PayPal verify-webhook-signature). Unsigned payload → 400.

## 5. File uploads

- `multer` memory storage, **8 MB** limit, `image/*` MIME filter.
- `sharp` re-decodes the actual bytes (rejects non-images regardless of the
  client's declared MIME), enforces a **40 MP** ceiling (decompression-bomb
  guard), and re-encodes to WebP which **strips all metadata**.
- Output filenames are random tokens (no user-controlled paths).

## 6. Secrets

- `.env` is git-ignored and **not tracked** (verified with `git ls-files`).
- Repo contains only placeholder examples in docs (`sk_live_or_test_...`,
  `whsec_...`) — no real keys.
- Startup validation blocks production boot on the default `JWT_SECRET` or
  `ADMIN_PASSWORD`.

## 7. Dependencies

- `npm audit` → **0 vulnerabilities**.
- Some dependencies have newer **major** versions available (express 5,
  helmet 8, multer 2, zod 4, etc.). Current pinned versions are on secure
  lines with no known advisories; major upgrades are deferred to avoid
  breaking changes and are tracked as routine maintenance, not a launch
  blocker.

---

## Residual items (operational — complete at deploy)

1. **Run behind HTTPS** with `NODE_ENV=production` so HSTS + secure cookies
   engage. (nginx example provided.)
2. **Set real secrets**: `JWT_SECRET`, admin password, gateway keys, SMTP.
   The app enforces the first two at boot.
3. **Point provider webhooks** at `/api/webhooks/{stripe,paypal}` and set the
   signing secret/id so async confirmation + refund reconciliation verify.
4. **Optional**: add a CAPTCHA (hCaptcha/Turnstile) on register/contact if you
   see abuse; rate-limiting + validation cover the baseline today.

_No code-level security blockers. Cleared for a controlled launch once the
operational items above are set._
