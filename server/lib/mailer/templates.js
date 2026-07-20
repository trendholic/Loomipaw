'use strict';
/** Branded, inline-styled HTML email templates. */
const config = require('../../config');
const { money } = require('../util');

const BRAND = '#1B1915', CLAY = '#A9764F', CREAM = '#FAF6EF', INK2 = '#34302A';

function shell(inner) {
  return `<div style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${BRAND}">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="text-align:center;padding:8px 0 24px">
        <span style="font-size:24px;font-weight:600;letter-spacing:.02em">Loomi<span style="color:${CLAY}">paw</span></span>
      </div>
      <div style="background:#fff;border-radius:14px;padding:32px 28px;box-shadow:0 10px 30px rgba(27,25,21,.06)">
        ${inner}
      </div>
      <p style="text-align:center;color:#9a8f7f;font-size:12px;margin-top:24px">
        ${config.store.name} · Premium pet lifestyle essentials<br>
        <a href="${config.appUrl}" style="color:${CLAY};text-decoration:none">${config.appUrl.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  </div>`;
}

const btn = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:${BRAND};color:${CREAM};text-decoration:none;padding:13px 26px;border-radius:100px;font-weight:600;font-size:14px">${label}</a>`;

const h = (t) => `<h1 style="font-size:22px;margin:0 0 12px;font-weight:600">${t}</h1>`;
const p = (t) => `<p style="color:${INK2};line-height:1.6;font-size:15px;margin:0 0 16px">${t}</p>`;

function welcome(user) {
  return shell(`${h(`Welcome, ${escapeHtml(user.name || 'friend')} 🐾`)}
    ${p('You just joined a community of pet parents who believe the everyday things around our dogs should be as considered and beautiful as anything we choose for ourselves.')}
    ${p('Enjoy <strong>10% off</strong> your first order with code <strong style="color:' + CLAY + '">WELCOME10</strong>.')}
    <div style="margin-top:8px">${btn(config.appUrl + '/collection.html', 'Explore the collection')}</div>`);
}

function passwordReset(user, url) {
  return shell(`${h('Reset your password')}
    ${p('We received a request to reset your Loomipaw password. This link expires in 60 minutes. If you didn’t request it, you can safely ignore this email.')}
    <div style="margin:8px 0 4px">${btn(url, 'Choose a new password')}</div>
    ${p('<span style="font-size:12px;color:#9a8f7f;word-break:break-all">' + url + '</span>')}`);
}

function orderRows(order) {
  return (order.items || []).map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee6d8;font-size:14px">
        ${escapeHtml(i.title)}${i.variant_label ? `<span style="color:#9a8f7f"> — ${escapeHtml(i.variant_label)}</span>` : ''}<br>
        <span style="color:#9a8f7f;font-size:12px">Qty ${i.qty}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eee6d8;text-align:right;font-size:14px;white-space:nowrap">
        ${money.format(i.unit_price_cents * i.qty, order.currency)}
      </td>
    </tr>`).join('');
}

const totalRow = (label, cents, order, bold) =>
  `<tr><td style="padding:4px 0;${bold ? 'font-weight:700;font-size:16px' : 'color:' + INK2}">${label}</td>
   <td style="padding:4px 0;text-align:right;${bold ? 'font-weight:700;font-size:16px' : 'color:' + INK2}">${money.format(cents, order.currency)}</td></tr>`;

function orderConfirmation(order) {
  const s = order.shipping || {};
  return shell(`${h('Thank you for your order!')}
    ${p(`Hi ${escapeHtml(s.name || 'there')}, your order <strong>${order.number}</strong> is confirmed and being prepared with care.`)}
    <table style="width:100%;border-collapse:collapse;margin:8px 0 4px">${orderRows(order)}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      ${totalRow('Subtotal', order.subtotal_cents, order)}
      ${order.discount_cents ? totalRow('Discount', -order.discount_cents, order) : ''}
      ${totalRow('Shipping', order.shipping_cents, order)}
      ${totalRow('Tax', order.tax_cents, order)}
      ${totalRow('Total', order.total_cents, order, true)}
    </table>
    <div style="margin-top:20px">${btn(config.appUrl + '/account/order.html?number=' + encodeURIComponent(order.number), 'View your order')}</div>
    <p style="color:#9a8f7f;font-size:13px;margin-top:20px;line-height:1.6">
      Shipping to: ${escapeHtml([s.address1, s.city, s.region, s.postal, s.country].filter(Boolean).join(', '))}
    </p>`);
}

function orderStatus(order) {
  const labels = {
    processing: 'is being prepared', fulfilled: 'has been fulfilled',
    shipped: 'is on its way', delivered: 'has been delivered',
    cancelled: 'has been cancelled', refunded: 'has been refunded',
  };
  return shell(`${h('Order update')}
    ${p(`Your order <strong>${order.number}</strong> ${labels[order.status] || 'status changed to ' + order.status}.`)}
    ${order.tracking_number ? p(`Tracking number: <strong>${escapeHtml(order.tracking_number)}</strong>`) : ''}
    <div style="margin-top:8px">${btn(config.appUrl + '/account/order.html?number=' + encodeURIComponent(order.number), 'Track your order')}</div>`);
}

function adminNewOrder(order) {
  const s = order.shipping || {};
  return shell(`${h('New order received 🎉')}
    ${p(`Order <strong>${order.number}</strong> · ${money.format(order.total_cents, order.currency)} · ${(order.items || []).reduce((n, i) => n + i.qty, 0)} item(s)`)}
    ${p(`Customer: ${escapeHtml(s.name || '')} &lt;${escapeHtml(order.email)}&gt;`)}
    <table style="width:100%;border-collapse:collapse;margin:8px 0 4px">${orderRows(order)}</table>
    <div style="margin-top:16px">${btn(config.appUrl + '/admin#order/' + encodeURIComponent(order.number), 'Open in admin')}</div>`);
}

function contactAdmin(msg) {
  return shell(`${h('New contact message')}
    ${p(`<strong>${escapeHtml(msg.name)}</strong> &lt;${escapeHtml(msg.email)}&gt;`)}
    ${p('<strong>Subject:</strong> ' + escapeHtml(msg.subject || '—'))}
    ${p(escapeHtml(msg.message).replace(/\n/g, '<br>'))}`);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = {
  welcome, passwordReset, orderConfirmation, orderStatus, contactAdmin, adminNewOrder,
  // Shared building blocks (reused by marketingTemplates.js).
  shell, btn, h, p, escapeHtml, BRAND, CLAY, CREAM, INK2,
};
