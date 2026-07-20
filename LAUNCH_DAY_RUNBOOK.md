# Loomipaw — Launch Day Runbook

The hour-by-hour operational script for going live. Companion to
`FINAL_GO_LIVE_CHECKLIST.md` (full config sign-off) — this is the **day-of**
sequence: verify, launch, watch, follow up. Assign an owner to each block.

Owner: __________  ·  Launch date/time: __________  ·  Rollback owner: __________

---

## T‑minus (before launch) — all must be ✅

### Backup
- [ ] `npm run db:backup` → snapshot created; `PRAGMA integrity_check` = `ok`.
- [ ] Off-server copy confirmed (S3/rsync) — `DISASTER_RECOVERY.md`.
- [ ] Note the current commit hash for rollback: __________

### Payment test
- [ ] `PAYMENT_PROVIDER` = live gateway (not `dev`); live keys set.
- [ ] Sandbox pass of `PAYMENT_PRODUCTION_CHECKLIST.md` tests 1–7.
- [ ] One **real card**, small amount → order `paid`; then **refund** it →
      gateway refund + stock restored + refund email.
- [ ] Unsigned webhook → **400**; signed webhook → order updates.

### Email test
- [ ] `MAIL_TRANSPORT=smtp` + SPF/DKIM/DMARC pass (`EMAIL.md`).
- [ ] `npm run test:email you@example.com` → 6/6, inbox (not spam).
- [ ] Marketing flows loaded in ESP (`npm run render:emails` previews ready).

### Analytics test
- [ ] `TRACKING_LAUNCH_CHECKLIST.md` signed off: GA4 + Meta + TikTok fire
      `purchase`/`Purchase`/`CompletePayment` on a test order.
- [ ] GA4 revenue == test order total; de-dupe on refresh confirmed.

### Inventory check
- [ ] `GET /api/admin/alerts` reviewed; best sellers buffered
      (`INVENTORY_MANAGEMENT_PLAN.md`).
- [ ] No active variant unintentionally at 0.

### Infra
- [ ] `/api/health` → `{ ok: true }` over **HTTPS**; secure `HttpOnly` cookies;
      HSTS present.
- [ ] App boots clean: `✓ Environment configuration looks good.`
- [ ] Uptime monitor + alerts armed (`MONITORING.md`).

---

## T‑0 — Launch

- [ ] Flip DNS / remove any holding page / announce.
- [ ] Immediately place **one live smoke order** yourself → confirm end-to-end
      (payment → emails → tracking event → admin shows it). Refund it.
- [ ] Post launch announcement (email list + social).

### First 4 hours — active monitoring
- [ ] **Errors:** watch logs / error alerts (`MONITORING.md`). 5xx spike →
      investigate immediately.
- [ ] **Orders:** Admin → Analytics; each order looks correct (totals, items,
      address, tax/shipping).
- [ ] **Payments:** no abnormal declines; webhooks succeeding; captures landing
      in the gateway dashboard.
- [ ] **Analytics:** GA4 Realtime shows traffic + `purchase`; pixels firing.
- [ ] **Support:** watch the inbox; respond fast (`CUSTOMER_SUPPORT_PLAYBOOK.md`).
- [ ] **Inventory:** watch best sellers vs. traffic; restock if a hero nears 0.

### Rollback triggers (act, don't wait)
- Checkout failing for real customers, payment capture broken, data/migration
  issue, or sustained 5xx. → **Rollback:**
  1. Redeploy previous image/commit (`FINAL_GO_LIVE_CHECKLIST.md` §8).
  2. Data issue only: stop app → `node scripts/restore.js <snapshot>` → start.
  3. Verify `/api/health`, place a test order, watch 5 min.

---

## T‑plus (after launch)

### Day 1–2
- [ ] Reconcile: GA4 revenue vs. Admin order revenue vs. gateway payouts.
- [ ] Fulfill all orders within the 1–2 day promise; add tracking.
- [ ] Confirm shipping-update + confirmation emails are landing.
- [ ] Triage every support ticket; log recurring themes.

### First customer review request
- [ ] Ensure the **post-purchase review email** (flow #3) is scheduled in the
      ESP (~10 days post-delivery). For the very first cohort, a personal
      "how's {dog_name} liking it?" note converts best.

### First optimization review (end of week 1)
- [ ] Pull the funnel (GA4): `view_item → add_to_cart → begin_checkout →
      purchase`. Where's the biggest drop? Ship one fix.
- [ ] Review Clarity recordings for friction (mobile especially).
- [ ] Ads: identify winners/losers; apply `PAID_AD_TESTING_PLAN.md` rules.
      **Do not scale** until the do-not-scale gate clears.
- [ ] Update `PROFIT_METRICS_PLAN.md` baselines with real Day‑1–7 numbers.

---

## One-screen war-room checklist

```
PRE     [ ] backup+offsite  [ ] live payment+refund  [ ] email 6/6
        [ ] analytics purchase verified  [ ] inventory ok  [ ] health/HTTPS/alerts
T-0     [ ] go live  [ ] smoke order + refund  [ ] announce
WATCH   [ ] errors  [ ] orders  [ ] payments/webhooks  [ ] analytics  [ ] support  [ ] stock
AFTER   [ ] reconcile revenue  [ ] fulfill+track  [ ] review-request scheduled  [ ] week-1 funnel review
ROLLBACK owner: ____   prev commit: ____
```

**Launch is boring when the prep is done. Verify everything, watch closely for
the first 4 hours, then optimize on real data.**
