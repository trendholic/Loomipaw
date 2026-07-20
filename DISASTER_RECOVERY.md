# Loomipaw — Disaster Recovery

The entire application state is **three things**: the SQLite database
(`data/loomipaw.db`), the uploaded images (`uploads/`), and your `.env`.
Back those up and you can rebuild anywhere in minutes.

---

## What to back up

| Asset | Path | How |
|-------|------|-----|
| Database | `data/loomipaw.db` | `npm run db:backup` (online, consistent, WAL-aware) |
| Uploaded images | `uploads/` | included in `npm run db:backup` as `uploads-*.tar.gz` |
| Secrets/config | `.env` | store in your secrets manager (NOT in git) |
| Code | git | already versioned |

`scripts/backup.js` writes timestamped snapshots to `./backups` (override with
`BACKUP_DIR`) and keeps the newest `BACKUP_KEEP` (default 14). **Copy the
backups off-box** (S3/rsync) — a backup on the same disk is not a backup.

---

## Recovery procedures

### A. Restore onto the same or a new host

```bash
# 1. Stop the app (restore refuses to run while it's up)
docker compose down          # or: systemctl stop loomipaw

# 2. Restore DB (+ uploads) from a backup
node scripts/restore.js backups/loomipaw-<stamp>.db backups/uploads-<stamp>.tar.gz

# 3. Start again and verify
docker compose up -d         # or: npm start
curl -s localhost:4000/api/health
```

The current DB is moved aside to `*.pre-restore` before replacing, so a bad
restore is itself reversible.

### B. Full rebuild from scratch (host lost)

```bash
git clone <repo> loomipaw && cd loomipaw
cp /secure/backup/.env .env          # restore secrets
npm ci --omit=dev
node scripts/restore.js /secure/backup/loomipaw-<stamp>.db /secure/backup/uploads-<stamp>.tar.gz
NODE_ENV=production npm start
```

### C. Corruption check / repair

```bash
node -e "console.log(require('better-sqlite3')('data/loomipaw.db').pragma('integrity_check'))"
```
If it does not print `ok`, restore from the latest good backup (procedure A).

---

## RPO / RTO

- **RPO (data loss window):** = your backup interval. Daily cron → ≤ 24 h.
  For near-zero RPO, back up hourly or replicate the `data` volume.
- **RTO (time to recover):** minutes — restore a file and start the process.

---

## Recommended cadence

- **Daily** automated `db:backup` via cron, retained 14–30 days.
- **Weekly** copy of the newest backup to a second location/region.
- **Quarterly** restore drill (procedure A into a staging host) to prove the
  backups actually work.
