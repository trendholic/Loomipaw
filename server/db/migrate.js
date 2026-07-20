'use strict';
/**
 * Applies schema.sql (idempotent) plus incremental, additive migrations that
 * SQLite cannot express with IF NOT EXISTS (new columns on existing tables).
 * Safe to run repeatedly and against an already-populated database.
 */
const fs = require('fs');
const path = require('path');
const db = require('./index');
const logger = require('../lib/logger');

// Add a column only if it is missing (SQLite has no ADD COLUMN IF NOT EXISTS).
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    logger.info('Migration: added column', { table, column });
  }
}

function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);

  // Incremental column additions for databases created before these existed.
  ensureColumn('users', 'token_version', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'failed_logins', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'locked_until', 'TEXT');
  ensureColumn('users', 'last_login_at', 'TEXT');

  db.pragma('optimize');
  logger.info('Database migrated');
}

if (require.main === module) {
  migrate();
  console.log('✓ Migration complete');
}

module.exports = migrate;
