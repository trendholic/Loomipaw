# Loomipaw — Monitoring & Observability

The app is stateless apart from SQLite, so monitoring is straightforward:
watch the health endpoint, ship the logs, and alert on a few signals.

---

## 1. Health endpoint

```
GET /api/health  →  200 {"ok":true,"name":"Loomipaw","time":"…"}
```

- Used by the Docker/compose **HEALTHCHECK** and the container orchestrator.
- Point an external uptime monitor at `https://your-domain.com/api/health`
  (see §4).
- Verify after deploy:
  ```bash
  curl -fsS https://your-domain.com/api/health && echo OK
  ```

---

## 2. Error & request logging

- Structured **JSON logs** go to **stdout** and to daily files in
  `var/logs/YYYY-MM-DD.log` (levels: info/warn/error; debug only when not
  production).
- The central error handler logs every 5xx with method, path, and stack; it
  never leaks internals to clients in production.
- **Ship stdout** to your log stack:
  - Docker: `docker compose logs -f app`, or a driver → Loki / CloudWatch /
    Datadog / Papertrail.
  - Bare Node under systemd: `journalctl -u loomipaw -f`.
- **Audit log** (security/business events) is queryable in the DB and in
  **Admin → Activity Log** (logins, lockouts, admin mutations, refunds,
  webhook outcomes).

Recommended log alerts:
- Spike in `level:error` (5xx).
- Repeated `auth.login.failure` / `auth.login.locked` from one IP (credential
  stuffing).
- `payment.webhook.failed`.

---

## 3. Performance monitoring

- Each API request is timed; enable debug logging (non-prod) or parse the
  reverse-proxy access log for latency percentiles.
- Baselines measured locally: product listing **~7 ms**, gzip reduces JSON
  payloads **~86%**.
- What to watch: p95 latency, 5xx rate, event-loop lag, and RSS memory.
- Lightweight options:
  - **nginx access logs** → latency + status distribution (no app change).
  - Add a Prometheus exporter later if desired (e.g. `express-prom-bundle`) —
    the app is a single process, so a `/metrics` route is easy to add.
- **Lighthouse / PageSpeed**: run against the live homepage + a product page
  to track front-end Core Web Vitals over time.

---

## 4. Uptime monitoring

- External monitor (UptimeRobot, Better Stack, Pingdom, or a cloud check) on
  `/api/health` every 1–5 min, alerting to email/Slack/PagerDuty.
- Also monitor the **homepage** (`/`) and a **product page** for full-stack
  reachability, and TLS-certificate expiry.

---

## 5. Disk & data

- The `data` volume (SQLite + WAL) and `uploads` volume grow over time — alert
  on volume usage > 80%.
- Confirm the **backup job ran** (alert if `backups/` has no file < 26 h old).
- Low-stock is surfaced in the Admin dashboard and `/api/admin/alerts`.

---

## 6. Suggested alert matrix

| Signal | Threshold | Action |
|--------|-----------|--------|
| Health check | 2 consecutive failures | Page on-call |
| 5xx rate | > 1% of requests over 5 min | Investigate logs |
| Login failures | > 50 / 10 min from one IP | Review, consider block/CAPTCHA |
| Webhook failures | any sustained | Check provider signing secret |
| Disk usage | > 80% | Expand volume / prune |
| Backup freshness | > 26 h old | Fix backup cron |
| TLS cert | < 14 days to expiry | Renew |
