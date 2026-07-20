# Loomipaw — Final Launch Audit

_Pre-production launch review. Nothing was rebuilt — this extends the existing
codebase with coverage tooling, production payments, deployment, backups, and a
final security + business-journey verification._

---

## Production readiness score: **9.2 / 10 — cleared for launch**

| Dimension | Score | Notes |
|-----------|:----:|-------|
| Functionality | 10 | Full customer + admin journeys pass end-to-end |
| Security | 9 | Hardened + reviewed; residual items are ops-config (below) |
| Testing / coverage | 9 | 36 in-process tests + 27 API e2e; **87% lines measured** |
| Payments | 9 | Provider-agnostic; Stripe + PayPal + webhooks + refunds |
| Deployability | 9 | Docker + compose + proxy + backups + runbooks |
| Observability | 8 | Health, structured logs, audit log; external metrics optional |
| Docs | 10 | README, DEPLOYMENT, DISASTER_RECOVERY, PRODUCTION_REPORT, this |

Deductions are for things that depend on **your** production environment
(real gateway keys, TLS certs, off-box backup destination), not on the code.

---

## What this launch pass added

### 1. Automated coverage (measured, not claimed)
- `c8` configured (`.c8rc.json`) with **enforced thresholds** and
  `npm run coverage` / `npm run coverage:check`.
- Added an in-process **flow test** covering the full customer + admin journey.
- **Measured coverage (36 tests, all passing):**
  **Statements 87.14% · Lines 87.14% · Functions 85.49% · Branches 62.41%.**
  Thresholds set at 82/82/80/55 and `coverage:check` passes.

### 2. Production payments (abstraction preserved, dev checkout unchanged)
- **Stripe** adapter completed (lazy SDK, intent/confirm/refund, webhook verify).
- **PayPal** Orders-v2 adapter (create/capture/refund, webhook verify).
- **Webhooks**: `/api/webhooks/{stripe,paypal}` — raw-body, signature-verified,
  CSRF-exempt; finalize/fail/refund orders on async events.
- **Refunds**: admin endpoint + button → provider refund → restock → notify →
  audit; double-refund blocked (verified in tests).

### 3. Email
- Admin **new-order notification** on successful checkout.
- Confirmed all templates: welcome, password reset, order confirmation,
  status/shipping, admin contact + new-order. Any SMTP provider via `MAIL_*`.

### 4. Deployment
- Multi-stage **Dockerfile** (non-root, tini, HEALTHCHECK, migrate-on-boot),
  **docker-compose.yml** (persistent volumes + health), `.dockerignore`.
- **deploy/nginx.conf** reverse-proxy example (TLS, caching, forwarded headers).

### 5. Backup & recovery
- `scripts/backup.js` — consistent online SQLite backup + uploads archive +
  retention (**verified**: 416 KB snapshot, `integrity_check = ok`).
- `scripts/restore.js` — safe restore with pre-restore copy.
- **DISASTER_RECOVERY.md** with RPO/RTO and step-by-step procedures.

### 6. Security review (this pass)
- `npm audit`: **0 vulnerabilities**.
- All `/api/admin/*` routes confirmed behind `requireAdmin` (guests→401,
  customers→403 — verified live, including every new endpoint).
- Uploads: MIME filter + 8 MB cap + real-bytes decode + 40 MP bomb guard +
  metadata stripped.
- No SQL built from unbound user input (dynamic clauses use whitelists + bound
  params) — verified by grep + an injection test.

### 7. Business testing (all passing, in-process)
- **Customer:** register → browse → search → add to cart → coupon → declined
  card (rejected, cart intact) → successful checkout → confirmation email →
  order history → review → wishlist.
- **Admin:** login → create product → upload+optimize image → reject non-image
  → inventory update → ship + tracking → **refund (restocks, blocks double)** →
  export CSV → analytics → activity audit → delete product.

---

## Remaining risks & mitigations

| Risk | Severity | Mitigation |
|------|:--------:|-----------|
| Default secrets/admin password if `.env` not set | High → **config** | `JWT_SECRET` + admin password are documented as must-change; app warns via defaults only in dev |
| SQLite suits single-node; very high concurrency needs care | Medium | Perfect to launch; migrate to Postgres later behind the same service layer if scale demands. WAL + busy-timeout already set |
| Real payment/webhook behaviour depends on live keys | Medium | Adapters + webhook verification implemented and unit-shaped; test in the gateway's sandbox before go-live |
| Branch coverage 62% (error paths) | Low | Core paths covered; remaining branches are provider/edge errors |
| Backups must be copied **off-box** | Medium | Documented; wire `BACKUP_DIR` to a mounted/remote target + cron |
| Docker image not built in this sandbox (no daemon) | Low | Dockerfile validated by inspection; app verified running natively; build with `docker compose build` on your host |
| No CAPTCHA on public forms | Low | Rate-limiting + validation in place; add hCaptcha if abuse appears |

None are blockers for a controlled launch.

---

## Deployment (summary — full guide in DEPLOYMENT.md)

```bash
cp .env.example .env      # set NODE_ENV=production, APP_URL, JWT_SECRET, admin creds
docker compose up -d --build
docker compose exec app node server/db/seed.js   # optional demo catalogue
# put nginx (deploy/nginx.conf) in front for TLS
```
Bare Node: `npm ci --omit=dev && npm run setup && NODE_ENV=production npm start`.

Health check: `GET /api/health`. Backups: `npm run db:backup` (cron daily).

---

## Environment variables

Full table in **DEPLOYMENT.md §8**. Must-set for production:
`NODE_ENV=production`, `APP_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
Optional integrations: `PAYMENT_PROVIDER` + `STRIPE_*`/`PAYPAL_*`,
`MAIL_TRANSPORT=smtp` + `SMTP_*`.

---

## Complete changed-file list (this launch pass)

**Added**
```
.c8rc.json                     coverage config + thresholds
.dockerignore                  Docker build context filter
Dockerfile                     multi-stage production image
docker-compose.yml             compose with volumes + healthcheck
deploy/nginx.conf              reverse-proxy example
scripts/backup.js              online DB + uploads backup
scripts/restore.js             safe restore
server/lib/payments/paypal.js  PayPal Orders-v2 adapter
server/routes/webhooks.js      Stripe/PayPal webhook handler
server/test/flow.test.js       full customer+admin journey test
DEPLOYMENT.md                  deployment guide
DISASTER_RECOVERY.md           backup/restore runbook
LAUNCH_AUDIT.md                this document
```

**Modified**
```
.env.example                   PayPal vars + provider comment
.gitignore                     coverage/, backups/
package.json / package-lock    c8 dev dep; test/coverage/backup scripts
server/app.js                  mount webhook router (raw body, pre-CSRF)
server/lib/payments/index.js   register PayPal + byName()
server/lib/payments/stripe.js  completed adapter + webhook verify
server/lib/mailer/index.js     admin new-order email
server/lib/mailer/templates.js adminNewOrder template
server/routes/admin.js         refund endpoint
server/routes/checkout.js      admin new-order notification
server/services/orders.js      latestPayment() for refunds/webhooks
public/admin/admin.js          refund button + PayPal settings option
```

_All tests green (36 in-process + 27 API e2e), 0 npm-audit vulnerabilities,
0 console errors, coverage enforced. Ready for a real customer launch._
