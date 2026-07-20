'use strict';
/**
 * Render every lifecycle/marketing email to var/mail/preview/*.html so you can
 * preview them in a browser and hand the HTML to your ESP.
 *
 *   npm run render:emails
 *
 * No network, no credentials — pure template rendering with sample context.
 */
const fs = require('fs');
const path = require('path');
const config = require('../server/config');
const mk = require('../server/lib/mailer/marketingTemplates');

const outDir = path.join(config.paths.mail, 'preview');
fs.mkdirSync(outDir, { recursive: true });

// Sample context grounded in the real catalog.
const sampleCart = {
  name: 'Alex',
  items: [
    { title: 'Trailhead Adventure Harness', priceCents: 6400, href: config.appUrl + '/product.html?slug=trailhead-adventure-harness' },
    { title: 'City Rope Lead', priceCents: 4400, href: config.appUrl + '/product.html?slug=city-rope-lead' },
  ],
};
const sampleOrder = { number: 'LP-10428', shipping: { name: 'Alex Rivera' }, currency: config.store.currency };
const sampleUser = { name: 'Alex' };

const jobs = [
  ['welcome-1-introduction', mk.welcome1, sampleUser],
  ['welcome-2-brand-story', mk.welcome2, sampleUser],
  ['welcome-3-best-sellers', mk.welcome3, {}],
  ['welcome-4-offer', mk.welcome4, sampleUser],
  ['abandoned-1-reminder', mk.abandoned1, sampleCart],
  ['abandoned-2-benefits', mk.abandoned2, sampleCart],
  ['abandoned-3-last-chance', mk.abandoned3, sampleCart],
  ['postpurchase-1-thank-you', mk.post1, sampleOrder],
  ['postpurchase-2-usage-guide', mk.post2, sampleOrder],
  ['postpurchase-3-review-request', mk.post3, sampleOrder],
];

let n = 0;
for (const [name, tpl, ctx] of jobs) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name} — ${tpl.subject}</title></head><body>${tpl.render(ctx)}</body></html>`;
  const file = path.join(outDir, `${name}.html`);
  fs.writeFileSync(file, html);
  console.log(`✓ ${name}  ·  subject: "${tpl.subject}"`);
  n++;
}
console.log(`\nRendered ${n} marketing emails → ${outDir}`);
