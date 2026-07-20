'use strict';
/**
 * Lifecycle / marketing email templates — ready for implementation.
 *
 * These render the same branded, inline-styled HTML as the transactional
 * templates (they reuse shell/btn/h/p from templates.js). They are designed to
 * be triggered by an ESP (Klaviyo/SendGrid/etc.) or the built-in mailer:
 *
 *   const mk = require('./marketingTemplates');
 *   mailer.send({ to, subject: mk.welcome1.subject, html: mk.welcome1.render(ctx) });
 *
 * Each export is { subject, render(ctx) }. Context shapes are documented per
 * flow. Copy is grounded in the real catalog and store policy (10% WELCOME10,
 * $75 free shipping, 30-day guarantee, OEKO-TEX®).
 *
 * See EMAIL_MARKETING_STRATEGY.md for timing/segmentation and
 * scripts/render-marketing-emails.js to preview them all as HTML.
 */
const config = require('../../config');
const { money } = require('../util');
const t = require('./templates');
const { shell, btn, h, p, escapeHtml, CLAY, INK2 } = t;

const url = (path = '/') => config.appUrl + path;
const shopBtn = (label = 'Shop the collection', path = '/collection.html') => btn(url(path), label);

// A small product-card row for best-sellers / cart items.
function productCard({ title, priceCents, image, href, note }) {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:6px 0">
    <tr>
      <td style="width:72px;padding:8px 12px 8px 0;vertical-align:top">
        ${image ? `<img src="${image}" alt="" width="72" height="72" style="border-radius:10px;object-fit:cover;display:block">` : ''}
      </td>
      <td style="vertical-align:top;font-size:14px;color:${INK2}">
        <strong style="color:#1B1915">${escapeHtml(title)}</strong><br>
        ${priceCents != null ? money.format(priceCents, config.store.currency) : ''}
        ${note ? `<span style="color:#9a8f7f"> · ${escapeHtml(note)}</span>` : ''}
        ${href ? `<br><a href="${href}" style="color:${CLAY};text-decoration:none;font-size:13px">View →</a>` : ''}
      </td>
    </tr></table>`;
}

const proof = () => p(`<span style="color:#9a8f7f;font-size:13px">★★★★★ Rated 4.9/5 across 12,000+ verified reviews · OEKO-TEX® certified · 30-day happiness guarantee</span>`);

/* ------------------------------------------------------------------ */
/* Welcome series  (ctx: { name })                                     */
/* ------------------------------------------------------------------ */
const welcome1 = {
  subject: "Welcome — here's your 10% off 🐾",
  render: (ctx = {}) => shell(`${h(`Welcome, ${escapeHtml(ctx.name || 'friend')} 🐾`)}
    ${p('You just joined a community of pet parents who believe the everyday things around our dogs should be as considered and beautiful as anything we choose for ourselves.')}
    ${p(`Here's <strong>10% off</strong> your first order with code <strong style="color:${CLAY}">WELCOME10</strong>.`)}
    ${p('Free carbon-neutral shipping over $75 · 30-day happiness guarantee · free returns.')}
    <div style="margin-top:8px">${shopBtn('Shop with 10% off')}</div>`),
};
const welcome2 = {
  subject: 'Why 40,000 pet parents chose Loomipaw',
  render: (ctx = {}) => shell(`${h('More than products — a celebration of the bond')}
    ${p('Loomipaw began with a simple belief: every stitch, buckle and weave should honour the relationship we share with our dogs. We use OEKO-TEX® certified materials, comfort-test on real dogs, and ship carbon-neutral.')}
    ${p('That’s why 40,000+ homes trust us — and why we back every piece with a 30-day happiness guarantee.')}
    <div style="margin-top:8px">${btn(url('/index.html#story'), 'Read our story')}</div>`),
};
const welcome3 = {
  // ctx: { bestSellers: [{title, priceCents, image, href}] }
  subject: 'The pieces everyone starts with',
  render: (ctx = {}) => {
    const items = (ctx.bestSellers && ctx.bestSellers.length ? ctx.bestSellers : [
      { title: 'Aspen Merino Knit', priceCents: 7800, href: url('/collection.html?category=apparel') },
      { title: 'Trailhead Adventure Harness', priceCents: 6400, href: url('/collection.html?category=walking') },
      { title: 'Cloud Orthopedic Lounger', priceCents: 18900, href: url('/collection.html?category=beds') },
    ]);
    return shell(`${h('Most loved, chosen by the pack')}
      ${p('If you’re not sure where to begin, start here — our best sellers, backed by thousands of five-star reviews.')}
      ${items.map(productCard).join('')}
      ${proof()}
      <div style="margin-top:12px">${shopBtn('Shop best sellers')}</div>`);
  },
};
const welcome4 = {
  subject: 'Your 10% off expires soon',
  render: (ctx = {}) => shell(`${h('A little nudge before it’s gone')}
    ${p(`Your welcome offer — <strong>10% off</strong> with <strong style="color:${CLAY}">WELCOME10</strong> — is still waiting. Add $75 and shipping is on us.`)}
    ${p('Not sure your dog will love it? Our 30-day happiness guarantee means free returns, no questions asked.')}
    <div style="margin-top:8px">${shopBtn('Use my 10% off')}</div>`),
};

/* ------------------------------------------------------------------ */
/* Abandoned cart  (ctx: { name, items:[{title,priceCents,image,href}] })*/
/* ------------------------------------------------------------------ */
function cartItems(ctx) {
  return (ctx.items || []).map(productCard).join('');
}
const abandoned1 = {
  subject: 'You left something for a good dog 🐾',
  render: (ctx = {}) => shell(`${h('Still thinking it over?')}
    ${p(`Hi ${escapeHtml(ctx.name || 'there')}, we saved your cart so you can pick up right where you left off.`)}
    ${cartItems(ctx)}
    <div style="margin-top:12px">${btn(url('/cart.html'), 'Return to my cart')}</div>`),
};
const abandoned2 = {
  subject: 'Made for comfort, built to last',
  render: (ctx = {}) => shell(`${h('Here’s why it’s worth it')}
    ${p('Every Loomipaw piece is crafted from OEKO-TEX® certified materials and comfort-tested on real dogs — designed to be loved for years, not weeks.')}
    ${cartItems(ctx)}
    ${proof()}
    ${p('Free carbon-neutral shipping over $75 · 30-day happiness guarantee.')}
    <div style="margin-top:8px">${btn(url('/cart.html'), 'Complete my order')}</div>`),
};
const abandoned3 = {
  subject: 'Last chance — your cart is about to expire',
  render: (ctx = {}) => shell(`${h('One last look')}
    ${p('Your cart won’t stay reserved forever, and popular pieces sell out. Complete your order today and enjoy free shipping over $75 plus our 30-day happiness guarantee.')}
    ${cartItems(ctx)}
    <div style="margin-top:12px">${btn(url('/cart.html'), 'Checkout now')}</div>`),
};

/* ------------------------------------------------------------------ */
/* Post-purchase  (ctx: order {number, items, shipping:{name}})        */
/* ------------------------------------------------------------------ */
const post1 = {
  subject: 'Thank you — your order is on the way to being made 🐾',
  render: (order = {}) => shell(`${h(`Thank you${order.shipping && order.shipping.name ? ', ' + escapeHtml(order.shipping.name.split(' ')[0]) : ''}!`)}
    ${p(`Order <strong>${escapeHtml(order.number || '')}</strong> is confirmed and being prepared with care. It ships within 1–2 business days — we’ll email tracking the moment it’s on the way.`)}
    ${p('In the meantime, follow <strong>@loomipaw</strong> and tag us to be featured in the #LoomipawFamily.')}
    <div style="margin-top:8px">${btn(url('/account/order.html?number=' + encodeURIComponent(order.number || '')), 'View your order')}</div>`),
};
const post2 = {
  subject: 'Getting the most out of your Loomipaw',
  render: (order = {}) => shell(`${h('A quick care & fit guide')}
    ${p('To keep everything looking and feeling its best:')}
    ${p('• <strong>Apparel:</strong> measure chest at the widest point; size up if between sizes.<br>• <strong>Harness & lead:</strong> adjust for two fingers of room; check fit as your dog grows.<br>• <strong>Beds & throws:</strong> machine-washable — a gentle cold cycle keeps them plush.')}
    ${p('Questions about fit or care? Just reply — we’re happy to help, and returns are always free within 30 days.')}
    <div style="margin-top:8px">${btn(url('/contact.html'), 'Ask us anything')}</div>`),
};
const post3 = {
  subject: 'How did we do? (30 seconds)',
  render: (order = {}) => shell(`${h('We’d love your honest review')}
    ${p('Your feedback helps other pet parents choose with confidence — and helps us keep making things better. It only takes a moment.')}
    ${proof()}
    <div style="margin-top:8px">${btn(url('/account/order.html?number=' + encodeURIComponent(order.number || '')), 'Leave a review')}</div>
    ${p('<span style="color:#9a8f7f;font-size:13px">As a thank-you, every review this month is entered into our giveaway.</span>')}`),
};

module.exports = {
  welcome: [welcome1, welcome2, welcome3, welcome4],
  abandonedCart: [abandoned1, abandoned2, abandoned3],
  postPurchase: [post1, post2, post3],
  // Flat access too:
  welcome1, welcome2, welcome3, welcome4,
  abandoned1, abandoned2, abandoned3,
  post1, post2, post3,
};
