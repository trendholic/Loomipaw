'use strict';
/**
 * Email abstraction layer.
 *
 * MAIL_TRANSPORT=dev  → renders each message to var/mail/*.eml (no network,
 *                        no credentials) so notifications are fully testable.
 * MAIL_TRANSPORT=smtp → real delivery via Nodemailer. Add SMTP_* creds in .env.
 *
 * Public API: mailer.send({ to, subject, html, text })
 *   plus convenience helpers that render branded templates.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../logger');
const templates = require('./templates');

fs.mkdirSync(config.paths.mail, { recursive: true });

let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  if (config.mail.transport === 'smtp') {
    if (!config.mail.smtp.host) {
      logger.warn('MAIL_TRANSPORT=smtp but SMTP_HOST is empty; falling back to dev transport.');
    } else {
      transporter = nodemailer.createTransport({
        host: config.mail.smtp.host,
        port: config.mail.smtp.port,
        secure: config.mail.smtp.secure,
        auth: config.mail.smtp.user ? { user: config.mail.smtp.user, pass: config.mail.smtp.pass } : undefined,
      });
      return transporter;
    }
  }
  // Dev transport → writes .eml files to disk.
  transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  return transporter;
}

async function send({ to, subject, html, text }) {
  const tx = getTransport();
  const message = { from: config.mail.from, to, subject, html, text: text || stripHtml(html) };
  try {
    const info = await tx.sendMail(message);
    if (config.mail.transport !== 'smtp' || !config.mail.smtp.host) {
      const file = path.join(config.paths.mail, `${Date.now()}-${slug(subject)}.eml`);
      fs.writeFileSync(file, info.message || renderEml(message));
      logger.info('Email written (dev transport)', { to, subject, file });
    } else {
      logger.info('Email sent (smtp)', { to, subject, id: info.messageId });
    }
    return { ok: true };
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message });
    return { ok: false, error: err.message };
  }
}

const stripHtml = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const slug = (s) => String(s).toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40);
const renderEml = (m) => `To: ${m.to}\nFrom: ${m.from}\nSubject: ${m.subject}\nContent-Type: text/html\n\n${m.html}`;

module.exports = {
  send,
  // Branded convenience helpers:
  sendWelcome: (user) => send({ to: user.email, subject: 'Welcome to the Loomipaw family 🐾', html: templates.welcome(user) }),
  sendPasswordReset: (user, url) => send({ to: user.email, subject: 'Reset your Loomipaw password', html: templates.passwordReset(user, url) }),
  sendOrderConfirmation: (order) => send({ to: order.email, subject: `Your Loomipaw order ${order.number} is confirmed`, html: templates.orderConfirmation(order) }),
  sendOrderStatus: (order) => send({ to: order.email, subject: `Update on your Loomipaw order ${order.number}`, html: templates.orderStatus(order) }),
  sendAdminNewOrder: (order) => send({ to: config.store.email, subject: `New order ${order.number} — ${(order.total_cents / 100).toFixed(2)} ${order.currency}`, html: templates.adminNewOrder(order) }),
  sendContactReceipt: (msg) => send({ to: config.store.email, subject: `New contact message: ${msg.subject || 'No subject'}`, html: templates.contactAdmin(msg) }),
};
