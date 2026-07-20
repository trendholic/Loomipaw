'use strict';
/**
 * Renders and sends every transactional email through the configured mailer
 * so you can verify templates + delivery.
 *
 *   node scripts/test-email.js you@example.com
 *
 * With MAIL_TRANSPORT=dev the messages are written to var/mail/*.eml (open
 * them in any mail client). With MAIL_TRANSPORT=smtp they are delivered for
 * real — use this to confirm SPF/DKIM/DMARC and inbox placement before launch.
 */
const mailer = require('../server/lib/mailer');
const config = require('../server/config');

const to = process.argv[2] || config.store.email;

const sampleOrder = {
  number: 'LP-SAMPLE01', email: to, currency: config.store.currency, status: 'processing',
  subtotal_cents: 15600, discount_cents: 1560, shipping_cents: 600, tax_cents: 1234, total_cents: 15874,
  tracking_number: 'TRK-SAMPLE-123',
  items: [
    { title: 'Aspen Merino Knit', variant_label: 'Oat · M', qty: 1, unit_price_cents: 7800, image: '' },
    { title: 'Trailhead Adventure Harness', variant_label: 'Sage · L', qty: 1, unit_price_cents: 6400, image: '' },
  ],
  shipping: { name: 'Sample Customer', address1: '12 Aspen Row', city: 'Portland', region: 'OR', postal: '97201', country: 'USA' },
};

(async () => {
  console.log(`Sending test emails to ${to} via "${config.mail.transport}" transport…\n`);
  const jobs = [
    ['Welcome', () => mailer.sendWelcome({ email: to, name: 'Sample Customer' })],
    ['Password reset', () => mailer.sendPasswordReset({ email: to, name: 'Sample Customer' }, `${config.appUrl}/account/reset.html?token=SAMPLE`)],
    ['Order confirmation', () => mailer.sendOrderConfirmation(sampleOrder)],
    ['Shipping / status update', () => mailer.sendOrderStatus({ ...sampleOrder, status: 'shipped' })],
    ['Refund notification', () => mailer.sendOrderStatus({ ...sampleOrder, status: 'refunded' })],
    ['Admin new-order', () => mailer.sendAdminNewOrder(sampleOrder)],
  ];
  let ok = 0;
  for (const [name, fn] of jobs) {
    try { const r = await fn(); console.log(`  ${r.ok ? '✓' : '✗'} ${name}${r.ok ? '' : ' — ' + r.error}`); if (r.ok) ok++; }
    catch (e) { console.log(`  ✗ ${name} — ${e.message}`); }
  }
  console.log(`\n${ok}/${jobs.length} emails sent.`);
  if (config.mail.transport !== 'smtp') console.log(`Dev transport: inspect them in ${config.paths.mail}`);
  process.exit(ok === jobs.length ? 0 : 1);
})();
