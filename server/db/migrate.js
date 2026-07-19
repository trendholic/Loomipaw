'use strict';
/** Apply schema.sql (idempotent — uses IF NOT EXISTS everywhere). */
const fs = require('fs');
const path = require('path');
const db = require('./index');
const logger = require('../lib/logger');

function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
  logger.info('Database migrated');
}

if (require.main === module) {
  migrate();
  console.log('✓ Migration complete');
}

module.exports = migrate;
