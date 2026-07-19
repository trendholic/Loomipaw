'use strict';
/** Minimal structured logger: console + rotating-ish daily file. */
const fs = require('fs');
const path = require('path');
const config = require('../config');

fs.mkdirSync(config.paths.logs, { recursive: true });

function write(level, msg, meta) {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta } : {}),
  });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(line + '\n');
  try {
    const file = path.join(config.paths.logs, `${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(file, line + '\n');
  } catch (_) { /* never let logging crash the app */ }
}

module.exports = {
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
  debug: (msg, meta) => { if (!config.isProd) write('debug', msg, meta); },
};
