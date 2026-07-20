'use strict';
/**
 * Restore the database (and optionally uploads) from a backup produced by
 * scripts/backup.js. STOP THE APP FIRST.
 *
 *   node scripts/restore.js backups/loomipaw-2026-07-20T03-00-00-000Z.db
 *   node scripts/restore.js <db-file> backups/uploads-<stamp>.tar.gz
 *
 * The current database is moved aside to *.pre-restore before replacing.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('../server/config');

const [dbBackup, uploadsBackup] = process.argv.slice(2);
if (!dbBackup) { console.error('Usage: node scripts/restore.js <db-backup> [uploads-backup.tar.gz]'); process.exit(1); }
if (!fs.existsSync(dbBackup)) { console.error('DB backup not found:', dbBackup); process.exit(1); }

// Safety: refuse to run if the server is up (probe the health endpoint —
// reliable and free of the pgrep self-match problem). Skip with --force.
async function assertStopped() {
  if (process.argv.includes('--force')) return;
  const port = process.env.PORT || 4000;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) { console.error(`✗ The app is responding on port ${port}. Stop it before restoring (or pass --force).`); process.exit(1); }
  } catch { /* not reachable — good, proceed */ }
}

(async () => {
await assertStopped();

// 1) Move current DB aside, then copy the backup into place.
for (const suffix of ['', '-wal', '-shm']) {
  const live = config.paths.db + suffix;
  if (fs.existsSync(live)) fs.renameSync(live, live + '.pre-restore');
}
fs.copyFileSync(dbBackup, config.paths.db);
console.log('✓ Database restored from', path.basename(dbBackup));

// 2) Optionally restore uploads.
if (uploadsBackup) {
  if (!fs.existsSync(uploadsBackup)) { console.error('Uploads backup not found:', uploadsBackup); process.exit(1); }
  execFileSync('tar', ['-xzf', uploadsBackup, '-C', config.paths.root]);
  console.log('✓ Uploads restored from', path.basename(uploadsBackup));
}

console.log('Done. Start the app and verify: npm start');
})();
