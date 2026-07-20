# Loomipaw — Final Go-Live Checklist

Work top to bottom. Nothing here requires code changes — it's configuration,
provider setup, and verification. Companion docs: `DEPLOYMENT.md`,
`PAYMENT_PRODUCTION_CHECKLIST.md`, `EMAIL.md`, `MONITORING.md`,
`SECURITY_FINAL_AUDIT.md`, `DISASTER_RECOVERY.md`.

---

## 1. Environment setup
- [ ] `cp .env.example .env`
- [ ] `NODE_ENV=production`
- [ ] `APP_URL=https://your-domain.com`
- [ ] `JWT_SECRET` = `openssl rand -base64 48` (the app **refuses to boot** in prod otherwise)
- [ ] `ADMIN_EMAIL` + a strong `ADMIN_PASSWORD` (not the default — also enforced at boot)
- [ ] `STORE_NAME` / `STORE_CURRENCY` / `STORE_EMAIL` set
- [ ] Boot once and confirm: `✓ Environment configuration looks good.` (or resolve the printed errors/warnings)

## 2. Payment activation
- [ ] `PAYMENT_PROVIDER=stripe` (or `paypal`) — **not `dev`**
- [ ] Live keys in `.env` (`sk_live_…` / live PayPal creds, `PAYPAL_ENV=live`)
- [ ] Stripe: `npm install stripe`
- [ ] Webhook registered → `/api/webhooks/{stripe,paypal}`, secret/id in `.env`
- [ ] Run `PAYMENT_PRODUCTION_CHECKLIST.md` tests 1–7 in the provider sandbox
- [ ] Confirm a bad/unsigned webhook returns **400**

## 3. Domain / HTTPS
- [ ] DNS A/AAAA record → server
- [ ] TLS certificate issued (certbot/Let's Encrypt)
- [ ] nginx in front (`deploy/nginx.conf`): HTTP→HTTPS redirect, `X-Forwarded-*` headers
- [ ] Verify `https://your-domain.com/api/health` → `{ ok: true }`
- [ ] Confirm secure cookies are set (DevTools → Application → Cookies: `Secure` + `HttpOnly` on `lp_session`)
- [ ] Confirm HSTS header present (`curl -I` shows `strict-transport-security`)

## 4. Email verification
- [ ] `MAIL_TRANSPORT=smtp` + `SMTP_*` + `MAIL_FROM` on your domain
- [ ] SPF, DKIM, DMARC DNS records published (`EMAIL.md`)
- [ ] `npm run test:email you@example.com` → 6/6, check inbox placement + auth pass
- [ ] Place a real test order → confirm customer + admin emails arrive

## 5. Backup verification
- [ ] `npm run db:backup` produces a snapshot; `PRAGMA integrity_check` = `ok`
- [ ] Daily cron scheduled (`DISASTER_RECOVERY.md`)
- [ ] Off-server copy configured (S3/rsync to another region)
- [ ] Do one restore drill on a staging copy

## 6. Analytics / monitoring setup
- [ ] Uptime monitor on `/api/health` (+ homepage + a product page)
- [ ] Log shipping configured (stdout → your stack)
- [ ] Alerts: 5xx rate, login-failure spikes, webhook failures, disk > 80%, backup freshness, TLS expiry
- [ ] (Optional) add a web analytics/consent tag if you collect visitor analytics
- [ ] Review **Admin → Analytics** and **Activity Log** populate correctly

## 7. First customer test order (production, real gateway)
- [ ] Register a real account
- [ ] Browse, search, add to cart, apply a coupon
- [ ] Checkout with a **real card** (small amount) → order `paid`
- [ ] Confirm confirmation email + admin notification received
- [ ] Admin: mark shipped (+ tracking) → customer gets shipping email
- [ ] Admin: **refund** the test order → verify gateway refund, stock restored, refund email
- [ ] Confirm the order + refund appear in **Admin → Activity Log**

## 8. Rollback procedure
If a deploy goes wrong:
1. **App-level:** redeploy the previous image/commit
   - Docker: `docker compose up -d` on the prior tag, or `git checkout <prev> && docker compose up -d --build`
   - Bare Node: `git checkout <prev> && npm ci --omit=dev && pm2 restart loomipaw`
2. **Data-level (only if a migration/data issue):** stop the app and restore
   the latest good snapshot:
   ```bash
   docker compose down
   node scripts/restore.js backups/loomipaw-<stamp>.db backups/uploads-<stamp>.tar.gz
   docker compose up -d
   ```
   Migrations are additive/idempotent, so app rollback rarely needs a data
   restore. The pre-restore copy (`*.pre-restore`) lets you undo a restore.
3. Verify `/api/health`, place a test order, watch logs for 5 minutes.

---

## Sign-off
- [ ] All boxes above checked
- [ ] `npm test` green · `npm run coverage:check` green · `npm audit` = 0
- [ ] On-call + rollback owner identified

**When every box is checked, you are ready to accept real customers.**
