'use strict';
const fs = require('fs');
const createApp = require('./app');
const config = require('./config');
const logger = require('./lib/logger');
const migrate = require('./db/migrate');

// Ensure runtime directories exist.
for (const dir of [config.paths.data, config.paths.uploads, config.paths.logs, config.paths.mail]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Apply migrations on boot (idempotent).
migrate();

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(`Loomipaw server running`, { url: config.appUrl, port: config.port, env: config.env, payments: config.payments.provider, mail: config.mail.transport });
  // eslint-disable-next-line no-console
  console.log(`\n  ✦ Loomipaw is live at ${config.appUrl}\n  ✦ Admin panel: ${config.appUrl}/admin  (login: ${config.admin.email})\n`);
});

// Graceful shutdown.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { logger.info(`Received ${sig}, shutting down`); server.close(() => process.exit(0)); });
}
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason) }));
process.on('uncaughtException', (err) => { logger.error('Uncaught exception', { error: err.message, stack: err.stack }); });

module.exports = server;
