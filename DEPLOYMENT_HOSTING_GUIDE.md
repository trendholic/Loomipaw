# Loomipaw — Deployment & Hosting Guide

Exact steps to deploy the Loomipaw store to production on **Render**, **Railway**,
or a **VPS**. No code changes are required — this is configuration only.
Companion: `DEPLOYMENT.md`, `DOMAIN_SETUP_GUIDE.md`, `PRODUCTION_ACTIVATION_GUIDE.md`,
`FINAL_GO_LIVE_CHECKLIST.md`.

---

## 1. Deployment requirements (confirmed from the repo)

| Item | Value | Source |
|------|-------|--------|
| **Application type** | Node.js + Express (CommonJS) monolith serving an API + static storefront | `package.json`, `server/app.js` |
| **Node version** | **≥ 18** declared; image pins **Node 20** (works on 20/22) | `package.json` `engines`, `Dockerfile` |
| **Framework** | Express 4 | `dependencies` |
| **Database** | **SQLite** via `better-sqlite3` (embedded, file-based, WAL) — **no external DB server** | `server/db/` |
| **Build command** | `npm ci --omit=dev` (installs runtime deps only; native `better-sqlite3`/`sharp` use prebuilt binaries) | — |
| **Migration** | `node server/db/migrate.js` (idempotent — safe every boot) | `server/db/migrate.js` |
| **Start command** | `node server/db/migrate.js && node server/index.js` (migrate, then start) | `Dockerfile` CMD / `package.json` |
| **Port** | Reads `process.env.PORT`, default **4000** — honors the platform-injected port automatically | `server/config.js` |
| **Health check URL** | **`/api/health`** → `{ ok: true }` | `server/app.js` |
| **Persistent storage** | **Required.** `data/` (SQLite DB), `uploads/` (product images), `var/` (logs/dev-mail). Must survive restarts/redeploys. | `Dockerfile` `VOLUME` |
| **Docker** | **Recommended** — multi-stage, non-root, tini, healthcheck already provided | `Dockerfile`, `docker-compose.yml` |

> ⚠️ **Critical:** because the database is a **file on disk**, the app needs a
> **persistent volume/disk** mounted at `data/` and `uploads/`. On any platform,
> deploying without persistent storage means **the database is wiped on every
> redeploy**. Every section below mounts a persistent disk.

### Config review (already production-grade — no changes needed)
- **Dockerfile:** multi-stage (build deps → slim runtime), non-root `node` user,
  `tini` for signal handling, `HEALTHCHECK` on `/api/health`, migrates on boot,
  named `VOLUME`s. ✅
- **docker-compose.yml:** `restart: unless-stopped`, named volumes for
  data/uploads/var, binds to `127.0.0.1:4000` (not public — sits behind the
  proxy), healthcheck, optional nginx TLS proxy block. ✅
- **`.env`:** git-ignored (verified — never committed). ✅

---

## 2. Production environment variable checklist

Copy `.env.example` → `.env` and set these. **Bold = the app refuses to boot in
production without a safe value.**

| Variable | Required? | Notes |
|----------|-----------|-------|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | auto | platform injects it; default 4000 |
| `APP_URL` | ✅ | `https://your-domain.com` (canonicals, emails, sitemap) |
| **`JWT_SECRET`** | ✅ **boot-blocks** | `openssl rand -base64 48` |
| **`ADMIN_PASSWORD`** | ✅ **boot-blocks** | strong, not the seeded default |
| `ADMIN_EMAIL` | ✅ | your admin login |
| `STORE_NAME` / `STORE_CURRENCY` / `STORE_EMAIL` | ✅ | store identity |
| `PAYMENT_PROVIDER` | ✅ for real orders | `stripe` or `paypal` (not `dev`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | if Stripe | live keys + webhook secret |
| PayPal creds + `PAYPAL_ENV=live` | if PayPal | — |
| `MAIL_TRANSPORT` | ✅ for real email | `smtp` + `SMTP_*` + `MAIL_FROM` |
| `GA4_MEASUREMENT_ID` / `META_PIXEL_ID` / `TIKTOK_PIXEL_ID` / `CLARITY_PROJECT_ID` | optional | analytics (loads only if set) |
| `BACKUP_DIR` / `BACKUP_KEEP` | optional | backups |

Boot once and confirm: `✓ Environment configuration looks good.` (Warnings about
`PAYMENT_PROVIDER=dev` / `MAIL_TRANSPORT=dev` are reminders to activate those
before taking real orders — see `PRODUCTION_ACTIVATION_GUIDE.md`.)

---

## 3. Render deployment

Render supports Docker directly (recommended, since the repo has a Dockerfile).

1. **New → Web Service** → connect the GitHub repo/branch.
2. **Runtime:** *Docker* (Render builds from the `Dockerfile`).
   *(Native Node alt: Build `npm ci --omit=dev`, Start `node server/db/migrate.js && node server/index.js`.)*
3. **Instance:** paid tier (free tier sleeps + has ephemeral disk).
4. **Add a Persistent Disk** (Settings → Disks):
   - Mount path `/app/data`, ~1 GB (and a second disk `/app/uploads`, ~2–5 GB),
     or one disk covering `/app` runtime data. **This is mandatory for SQLite.**
5. **Health Check Path:** `/api/health`.
6. **Environment:** add every var from §2. (`PORT` is provided by Render — the app
   reads it automatically.)
7. **Deploy.** Migrations run on boot (Dockerfile CMD).
8. Verify: `https://<service>.onrender.com/api/health` → `{ ok: true }`.

Optional `render.yaml` (Blueprint) you can add at the repo root:
```yaml
services:
  - type: web
    name: loomipaw
    runtime: docker
    healthCheckPath: /api/health
    disk:
      name: loomipaw-data
      mountPath: /app/data
      sizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
      # set JWT_SECRET, ADMIN_PASSWORD, APP_URL, etc. in the dashboard (secret)
```

## 4. Railway deployment

1. **New Project → Deploy from GitHub repo.** Railway detects the Dockerfile.
2. **Add a Volume** (right-click service → *Add Volume*) mounted at **`/app/data`**
   (and one at `/app/uploads`). **Required** — without it SQLite is wiped on redeploy.
3. **Variables:** add all of §2. Railway injects `PORT` — the app honors it.
4. **Networking → Generate Domain** for a public URL; set **Healthcheck Path**
   `/api/health`.
5. **Deploy.** The Dockerfile migrates on boot.
6. Verify `https://<app>.up.railway.app/api/health`.

*(Native/Nixpacks alt: Build `npm ci --omit=dev`, Start
`node server/db/migrate.js && node server/index.js`.)*

## 5. VPS deployment (Docker Compose — recommended)

On a Linux server (DigitalOcean/Hetzner/EC2) with Docker + Docker Compose:

```bash
# 1. Clone + configure
git clone <repo> loomipaw && cd loomipaw
cp .env.example .env
nano .env            # set NODE_ENV=production, APP_URL, JWT_SECRET, ADMIN_PASSWORD, etc.

# 2. Build + run (named volumes persist data/uploads/var)
docker compose up -d --build

# 3. Verify (app binds to 127.0.0.1:4000)
curl -s localhost:4000/api/health        # → {"ok":true,...}
docker compose logs -f app               # watch boot: migration + "listening"
```

**TLS / public access:** put nginx in front (the repo's `deploy/nginx.conf` +
the commented `proxy` service in `docker-compose.yml`), then issue a cert:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
See `DOMAIN_SETUP_GUIDE.md` for DNS + HTTPS.

**Bare Node (no Docker) alt:**
```bash
npm ci --omit=dev
NODE_ENV=production node server/db/migrate.js
pm2 start server/index.js --name loomipaw     # or a systemd unit
```

**Backups (all hosts):** schedule `npm run db:backup` via cron + copy off-server
(`DISASTER_RECOVERY.md`). A backup on the same disk is not a backup.

---

## 6. Platform comparison

| | Render | Railway | VPS (Docker) |
|--|--------|---------|--------------|
| Setup effort | Low | Lowest | Medium |
| Persistent disk | Add a Disk (required) | Add a Volume (required) | Named volumes (built-in) |
| TLS | Automatic | Automatic | certbot (manual, ~2 min) |
| Cost | $ (needs paid for disk) | $ (usage-based) | $ (cheap VPS) |
| Control | Medium | Medium | Full |
| Best for | Fastest managed launch | Fastest managed launch | Lowest cost + full control |

**All three work.** SQLite means one thing everywhere: **mount a persistent
disk.** Pick by your comfort with servers (managed = Render/Railway; hands-on =
VPS).

---

## 7. Post-deploy verification (every host)

```bash
curl -sI https://your-domain.com/api/health     # 200
```
- [ ] `/api/health` → `{ ok: true }`
- [ ] Boot log shows migration ran + `✓ Environment configuration looks good.`
- [ ] Storefront loads over HTTPS; a product page renders
- [ ] Admin login works with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- [ ] Persistent disk confirmed (redeploy → data survives)
- [ ] Then: `PRODUCTION_ACTIVATION_GUIDE.md` (payments, email, analytics, backups)
