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

> ✅ **Verified in this build:** a full `backup → restore` round-trip was run
> against the live database; the restored copy passed `PRAGMA integrity_check`
> (`ok`) with all rows intact.

### Automated daily backup (cron)

```cron
# /etc/cron.d/loomipaw-backup  — daily 03:00, keep 30, log output
0 3 * * *  deploy  cd /opt/loomipaw && BACKUP_DIR=/var/backups/loomipaw BACKUP_KEEP=30 /usr/bin/node scripts/backup.js >> var/logs/backup.log 2>&1
```

With Docker (backs up inside the container to a mounted volume):
```cron
0 3 * * *  root  docker compose -f /opt/loomipaw/docker-compose.yml exec -T app node scripts/backup.js >> /var/log/loomipaw-backup.log 2>&1
```

### Off-server copy (do this — same-disk backups don't survive host loss)

```bash
# S3 (versioned bucket recommended)
aws s3 sync /var/backups/loomipaw s3://your-bucket/loomipaw/ --storage-class STANDARD_IA

# or rsync to another host
rsync -az --delete /var/backups/loomipaw/ backup-host:/backups/loomipaw/
```
Append either line to the cron job after `backup.js`, or run it on its own
schedule. Keep at least one copy in a **different region/provider**.

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
restore is itself reversible. `restore.js` **refuses to run while the app is
responding** on `/api/health` (probe-based, reliable); pass `--force` only if
you are certain the app is stopped.

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
