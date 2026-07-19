'use strict';
/** Single shared better-sqlite3 connection with sane pragmas. */
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../config');

fs.mkdirSync(config.paths.data, { recursive: true });

const db = new Database(config.paths.db);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

module.exports = db;
