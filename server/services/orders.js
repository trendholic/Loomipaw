'use strict';
/** Order creation & lifecycle. Stock decrement + order write are atomic. */
const db = require('../db');
const { HttpError, orderNumber } = require('../lib/util');
const cartService = require('./cart');
const coupons = require('./coupons');
const settings = require('./settings');

const q = {
  variant: db.prepare('SELECT v.*, p.title AS product_title, p.status AS product_status, p.price_cents AS product_price, p.id AS product_id, (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position, id LIMIT 1) AS image FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?'),
  decrementStock: db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?'),
  incrementStock: db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?'),
  invLog: db.prepare('INSERT INTO inventory_log (variant_id, delta, reason, ref) VALUES (?, ?, ?, ?)'),
  insertOrder: db.prepare(`INSERT INTO orders
    (number, user_id, email, status, financial_status, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency, coupon_code, shipping_method, shipping_json, billing_json, payment_provider, notes)
    VALUES (@number,@user_id,@email,@status,@financial_status,@subtotal_cents,@discount_cents,@shipping_cents,@tax_cents,@total_cents,@currency,@coupon_code,@shipping_method,@shipping_json,@billing_json,@payment_provider,@notes)`),
  insertItem: db.prepare(`INSERT INTO order_items (order_id, product_id, variant_id, title, variant_label, sku, image, unit_price_cents, qty)
    VALUES (@order_id,@product_id,@variant_id,@title,@variant_label,@sku,@image,@unit_price_cents,@qty)`),
  insertPayment: db.prepare(`INSERT INTO payments (order_id, provider, provider_ref, amount_cents, currency, status, raw_json)
    VALUES (@order_id,@provider,@provider_ref,@amount_cents,@currency,@status,@raw_json)`),
  orderById: db.prepare('SELECT * FROM orders WHERE id = ?'),
  orderByNumber: db.prepare('SELECT * FROM orders WHERE number = ?'),
  itemsFor: db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id'),
  setStatus: db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"),
  setFinancial: db.prepare("UPDATE orders SET financial_status = ?, payment_ref = ?, updated_at = datetime('now') WHERE id = ?"),
  setTracking: db.prepare("UPDATE orders SET tracking_number = ?, updated_at = datetime('now') WHERE id = ?"),
};

/**
 * Reserve stock and create an order in `pending` state (before payment
 * capture). Runs in a single transaction so partial writes never persist.
 */
const createPendingOrder = db.transaction(({ cart, priced, contact, shippingAddress, billingAddress, provider }) => {
  if (!priced.items.length) throw new HttpError(400, 'Your cart is empty');

  // Re-validate stock atomically and decrement.
  for (const item of priced.items) {
    const v = q.variant.get(item.variantId);
    if (!v || v.product_status !== 'active') throw new HttpError(409, `"${item.title}" is no longer available`);
    const res = q.decrementStock.run(item.qty, v.id, item.qty);
    if (res.changes === 0) throw new HttpError(409, `Not enough stock for "${item.title}" (only ${v.stock} left)`, { variantId: v.id, stock: v.stock });
    q.invLog.run(v.id, -item.qty, 'order', '');
  }

  const number = orderNumber();
  const info = q.insertOrder.run({
    number,
    user_id: cart.user_id || null,
    email: contact.email,
    status: 'pending',
    financial_status: 'unpaid',
    subtotal_cents: priced.subtotalCents,
    discount_cents: priced.discountCents,
    shipping_cents: priced.shippingCents,
    tax_cents: priced.taxCents,
    total_cents: priced.totalCents,
    currency: priced.currency,
    coupon_code: priced.coupon && !priced.coupon.invalid ? priced.coupon.code : '',
    shipping_method: priced.shipping.methodId,
    shipping_json: JSON.stringify(shippingAddress),
    billing_json: JSON.stringify(billingAddress || shippingAddress),
    payment_provider: provider,
    notes: '',
  });
  const orderId = info.lastInsertRowid;

  for (const item of priced.items) {
    q.insertItem.run({
      order_id: orderId,
      product_id: null,
      variant_id: item.variantId,
      title: item.title,
      variant_label: item.variantLabel,
      sku: item.sku,
      image: item.image || '',
      unit_price_cents: item.unitPriceCents,
      qty: item.qty,
    });
  }

  if (priced.coupon && !priced.coupon.invalid) coupons.incrementUsage(priced.coupon.code);

  return q.orderById.get(orderId);
});

// Restore stock for a cancelled/failed order.
const restock = db.transaction((orderId) => {
  const items = q.itemsFor.all(orderId);
  for (const it of items) {
    if (it.variant_id) {
      q.incrementStock.run(it.qty, it.variant_id);
      q.invLog.run(it.variant_id, it.qty, 'cancel', String(orderId));
    }
  }
});

function recordPayment(orderId, { provider, ref, amountCents, currency, status, raw }) {
  q.insertPayment.run({
    order_id: orderId, provider, provider_ref: ref || '', amount_cents: amountCents,
    currency: currency || 'USD', status, raw_json: JSON.stringify(raw || {}),
  });
}

function markPaid(order, ref) {
  q.setFinancial.run('paid', ref || '', order.id);
  q.setStatus.run('processing', order.id);
  return q.orderById.get(order.id);
}

function markFailed(order) {
  q.setFinancial.run('failed', '', order.id);
  q.setStatus.run('cancelled', order.id);
  restock(order.id);
  return q.orderById.get(order.id);
}

const STATUS_FLOW = ['pending', 'paid', 'processing', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'];

function updateStatus(order, status, { tracking } = {}) {
  if (!STATUS_FLOW.includes(status)) throw new HttpError(400, 'Invalid status');
  if ((status === 'cancelled' || status === 'refunded') && order.status !== 'cancelled' && order.status !== 'refunded') {
    restock(order.id);
    if (status === 'refunded') q.setFinancial.run('refunded', order.payment_ref, order.id);
  }
  if (tracking != null) q.setTracking.run(tracking, order.id);
  q.setStatus.run(status, order.id);
  return q.orderById.get(order.id);
}

function withItems(order) {
  if (!order) return null;
  const o = { ...order };
  o.items = q.itemsFor.all(order.id);
  try { o.shipping = JSON.parse(order.shipping_json || '{}'); } catch { o.shipping = {}; }
  try { o.billing = JSON.parse(order.billing_json || '{}'); } catch { o.billing = {}; }
  return o;
}

module.exports = {
  createPendingOrder, recordPayment, markPaid, markFailed, updateStatus, restock,
  withItems, byNumber: (n) => q.orderByNumber.get(n), byId: (id) => q.orderById.get(id),
  STATUS_FLOW,
};
