'use strict';
/**
 * Consistent online backup of the SQLite database (safe while the app runs,
 * WAL-aware) plus an archive of uploaded images. Retains the newest N.
 *
 *   node scripts/backup.js            # DB + uploads → ./backups
 *   BACKUP_DIR=/mnt/backups node scripts/backup.js
 *   BACKUP_KEEP=14 node scripts/backup.js
 *
 * Schedule via cron, e.g. daily at 03:00:
 *   0 3 * * *  cd /app && /usr/bin/node scripts/backup.js >> var/logs/backup.log 2>&1
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');
const config = require('../server/config');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(config.paths.root, 'backups');
const KEEP = parseInt(process.env.BACKUP_KEEP || '14', 10);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

fs.mkdirSync(BACKUP_DIR, { recursive: true });

(async () => {
  // 1) Database — use the online backup API (atomic, consistent snapshot).
  const dbFile = path.join(BACKUP_DIR, `loomipaw-${stamp}.db`);
  const db = new Database(config.paths.db, { readonly: true });
  await db.backup(dbFile);
  db.close();
  const dbBytes = fs.statSync(dbFile).size;

  // 2) Uploads — tar the product images (skip if none / tar unavailable).
  let uploadsInfo = 'skipped (no uploads)';
  try {
    if (fs.existsSync(config.paths.uploads) && fs.readdirSync(config.paths.uploads).length) {
      const tarFile = path.join(BACKUP_DIR, `uploads-${stamp}.tar.gz`);
      execFileSync('tar', ['-czf', tarFile, '-C', config.paths.root, 'uploads']);
      uploadsInfo = `${(fs.statSync(tarFile).size / 1024).toFixed(0)} KB`;
    }
  } catch (e) { uploadsInfo = `uploads archive failed: ${e.message}`; }

  // 3) Retention — keep the newest KEEP of each kind.
  for (const prefix of ['loomipaw-', 'uploads-']) {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(prefix)).sort().reverse();
    for (const stale of files.slice(KEEP)) fs.unlinkSync(path.join(BACKUP_DIR, stale));
  }

  console.log(`✓ Backup complete → ${BACKUP_DIR}`);
  console.log(`  database: ${path.basename(dbFile)} (${(dbBytes / 1024).toFixed(0)} KB)`);
  console.log(`  uploads:  ${uploadsInfo}`);
  console.log(`  retention: keeping newest ${KEEP}`);
})().catch((e) => { console.error('✗ Backup failed:', e.message); process.exit(1); });
