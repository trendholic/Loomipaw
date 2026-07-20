# Loomipaw — Production Activation Guide

The step-by-step to flip the built platform into a live, revenue-taking store.
Everything here is **configuration + verification** — no code changes. Work top
to bottom; each block ends with a concrete "verified when" check. Companion:
`FINAL_GO_LIVE_CHECKLIST.md`, `LAUNCH_DAY_RUNBOOK.md`,
`TRACKING_LAUNCH_CHECKLIST.md`, `PAYMENT_PRODUCTION_CHECKLIST.md`, `EMAIL.md`,
`DISASTER_RECOVERY.md`.

> The app **refuses to boot in production** on a default `JWT_SECRET` or
> `ADMIN_PASSWORD` (verified: 2 errors → exit 1). That's your first gate.

---

## 1. Domain / HTTPS / SSL / redirects

- [ ] **DNS:** A/AAAA record → server IP (and `www`). Propagation confirmed
      (`dig +short your-domain.com`).
- [ ] **TLS/SSL cert** issued (certbot/Let's Encrypt or provider).
      `deploy/nginx.conf` references the cert paths.
- [ ] **HTTPS** serves the site; **HTTP → HTTPS** 301 redirect works
      (nginx block already does this).
- [ ] **`www` ↔ apex** redirect to one canonical host (pick one; 301 the other).
- [ ] `APP_URL=https://your-domain.com` set (drives canonicals, emails, sitemap).
- **Verified when:** `curl -I http://your-domain.com` → 301 to `https://`;
  `curl -sI https://your-domain.com/api/health` → 200 with
  `strict-transport-security` present; padlock valid in browser.

## 2. Payments (live)

- [ ] `PAYMENT_PROVIDER=stripe` (or `paypal`) — **not `dev`**.
- [ ] Live keys in `.env` (`sk_live_…` / live PayPal creds, `PAYPAL_ENV=live`).
      Stripe: `npm install stripe`.
- [ ] **Webhook** registered → `/api/webhooks/{stripe,paypal}`; secret/id in `.env`.
- [ ] Run `PAYMENT_PRODUCTION_CHECKLIST.md` tests 1–7 in the provider sandbox.
- [ ] **Real payment test:** one small live charge → order `paid`; then **refund**
      it → gateway refund + stock restored + refund email.
- [ ] Unsigned webhook → **400**; signed webhook updates the order.
- **Verified when:** a real card produces a `paid` order and a clean refund, and
  the gateway dashboard shows the charge + refund.

## 3. Email (production)

- [ ] `MAIL_TRANSPORT=smtp` + `SMTP_*` + `MAIL_FROM` on your domain.
- [ ] **SPF** (TXT), **DKIM** (CNAME/TXT from ESP), **DMARC** (`_dmarc` TXT) —
      shapes in `EMAIL.md`.
- [ ] `npm run test:email you@example.com` → **6/6**, land in inbox (not spam).
- [ ] Send to Gmail **and** Outlook; confirm headers show `spf=pass`,
      `dkim=pass`, `dmarc=pass`.
- [ ] Marketing flows loaded into the ESP (`npm run render:emails` previews ready).
- **Verified when:** a live test order's confirmation + admin emails arrive in
  the inbox with auth passing.

## 4. Analytics (receiving real data)

Follow `TRACKING_LAUNCH_CHECKLIST.md`; summary gates:

- [ ] Env IDs set: `GA4_MEASUREMENT_ID`, `META_PIXEL_ID`, `TIKTOK_PIXEL_ID`,
      `CLARITY_PROJECT_ID`. No CSP violations in console.
- [ ] **GA4 receiving data** — Realtime shows sessions; DebugView shows
      `view_item / add_to_cart / begin_checkout / purchase`.
- [ ] **Meta Pixel receiving events** — Pixel Helper + Test Events show
      `ViewContent / AddToCart / InitiateCheckout / Purchase`.
- [ ] **TikTok Pixel receiving events** — Pixel Helper shows through
      `CompletePayment`.
- [ ] **Purchase event validation** — `purchase.value` == order total on all
      three; de-dupe holds on confirmation refresh; GA4 revenue reconciles with
      Admin orders.
- **Verified when:** a test order shows a matching Purchase + revenue on GA4,
  Meta, and TikTok.

## 5. Backups

- [ ] `npm run db:backup` → snapshot; `PRAGMA integrity_check` = `ok`.
- [ ] **Automated schedule** (cron) set — `DISASTER_RECOVERY.md` (daily 03:00).
- [ ] **Off-server copy** configured (S3/rsync to another region).
- [ ] **Restore test** on staging: `node scripts/restore.js <snapshot>` → app
      starts, data intact (round-trip already proven in-repo).
- **Verified when:** a scheduled backup lands off-box and a restore drill
  succeeds.

---

## Activation sign-off

| Block | Verified | Owner | Date |
|-------|:--------:|-------|------|
| Domain / HTTPS / redirects | ☐ | | |
| Payments (live + refund) | ☐ | | |
| Email (SMTP + SPF/DKIM/DMARC + inbox) | ☐ | | |
| Analytics (GA4/Meta/TikTok + Purchase) | ☐ | | |
| Backups (schedule + restore drill) | ☐ | | |

When all five are ✅, proceed to `LAUNCH_DAY_RUNBOOK.md`. Do not start paid
traffic until Analytics is ✅ (see `AD_SCALING_RULEBOOK.md`).
