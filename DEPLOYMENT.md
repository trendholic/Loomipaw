# Loomipaw — Deployment Guide

Standalone Node.js + SQLite store. No external database or commerce platform
required. Two supported paths: **Docker (recommended)** or **bare Node**.

---

## 1. Prerequisites

- A Linux host (1 vCPU / 1 GB RAM is plenty to start).
- Docker + Docker Compose **or** Node.js ≥ 18.
- A domain + TLS certificate (Let's Encrypt/certbot) for production.

---

## 2. Configure

```bash
cp .env.example .env
```

Set at minimum (see **Environment variables** below):

```
NODE_ENV=production
APP_URL=https://your-domain.com
JWT_SECRET=<64+ random chars>          # openssl rand -base64 48
ADMIN_EMAIL=you@your-domain.com
ADMIN_PASSWORD=<strong password>
```

Everything else works with defaults; add payment/email credentials when ready.

---

## 3a. Deploy with Docker (recommended)

```bash
docker compose up -d --build
```

- The container **migrates the DB on boot** and starts the server.
- Data persists in named volumes: `loomipaw_data` (DB), `loomipaw_uploads`
  (images), `loomipaw_var` (logs/mail).
- The app listens on `127.0.0.1:4000` — put nginx (or your platform's proxy)
  in front for TLS. See `deploy/nginx.conf`.

Seed the catalogue once (optional — the store also works empty and you can add
products in the admin):

```bash
docker compose exec app node server/db/seed.js
```

Container health: `docker compose ps` shows `healthy` (uses `/api/health`).

## 3b. Deploy with bare Node

```bash
npm ci --omit=dev
npm run setup          # migrate + seed
NODE_ENV=production npm start
```

Run under a process manager (systemd or pm2) so it restarts on crash/reboot,
e.g. a systemd unit running `node server/index.js` with `EnvironmentFile=.env`.

---

## 4. Reverse proxy + TLS

Use `deploy/nginx.conf` as a starting point (HTTP→HTTPS redirect, TLS,
upload size, upload caching, correct `X-Forwarded-*` headers so rate-limiting
and secure cookies work). The app already sets HSTS and secure cookies when
`NODE_ENV=production`.

---

## 5. Database migrations

- Migrations are **idempotent** and run automatically on boot (Docker) or via
  `npm run migrate`. Schema changes use `IF NOT EXISTS` + additive
  `ALTER TABLE` guards, so upgrading in place is safe.
- To apply after pulling new code on bare Node: `npm run migrate`.

---

## 6. Backups (see also DISASTER_RECOVERY.md)

```bash
npm run db:backup                      # → ./backups (DB snapshot + uploads.tar.gz)
BACKUP_DIR=/mnt/backups BACKUP_KEEP=30 npm run db:backup
```

Schedule daily via cron:

```
0 3 * * *  cd /opt/loomipaw && /usr/bin/node scripts/backup.js >> var/logs/backup.log 2>&1
```

With Docker, run inside the container (or mount the volume on the host):

```bash
docker compose exec app node scripts/backup.js
```

Copy `backups/` off-box (S3, rsync) for real durability.

---

## 7. Monitoring & logging

- **Health**: `GET /api/health` → `{ ok: true }`. Wire to your uptime monitor
  (UptimeRobot, Pingdom) and the container/orchestrator health check.
- **Logs**: structured JSON to stdout **and** daily files in `var/logs/`.
  In Docker, ship stdout to your log stack (Loki/CloudWatch/Datadog). Set
  `NODE_ENV=production` to silence debug lines.
- **Audit log**: security/business events in the `audit_log` table, browsable
  in Admin → Activity Log.
- **Recommended alerts**: health-check failures, 5xx rate, disk usage on the
  data volume, and low-stock (Admin dashboard surfaces counts).
- **Metrics option**: front with nginx and scrape its access logs, or add a
  `/metrics` exporter later — the app is stateless apart from SQLite.

---

## 8. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | prod | `production` enables HSTS, secure cookies, disables debug logs |
| `PORT` | – | default `4000` |
| `APP_URL` | prod | canonical URL used in emails, links, sitemap, SEO |
| `JWT_SECRET` | **yes** | signs sessions — must be long & random in prod |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed | bootstrap admin (change the password!) |
| `STORE_NAME` / `STORE_CURRENCY` / `STORE_EMAIL` | – | store defaults (also editable in Admin → Settings) |
| `PAYMENT_PROVIDER` | – | `dev` (default) · `stripe` · `paypal` |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | if stripe | Stripe keys |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_ENV` / `PAYPAL_WEBHOOK_ID` | if paypal | PayPal creds |
| `MAIL_TRANSPORT` | – | `dev` (writes `.eml`) · `smtp` |
| `MAIL_FROM` | – | From header |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | if smtp | any SMTP provider (SendGrid, Postmark, SES, Mailgun…) |
| `CORS_ORIGINS` | – | comma-separated allowed origins (blank = same-origin) |

### Connecting a payment gateway
1. Set `PAYMENT_PROVIDER` + the provider's keys in `.env`.
2. Stripe: `npm install stripe`. PayPal: no package needed (REST via fetch).
3. Point the provider's webhook at `https://your-domain.com/api/webhooks/stripe`
   (or `/paypal`) and set the webhook secret/id.
The checkout flow is unchanged — only configuration.

### Connecting email
Set `MAIL_TRANSPORT=smtp` and your provider's SMTP settings. Until then all
mail renders to `var/mail/*.eml` for inspection.
