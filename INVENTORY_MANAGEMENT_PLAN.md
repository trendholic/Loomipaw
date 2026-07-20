# Loomipaw — Inventory Management Plan

Audit of the inventory system + how to operate it. **Audit result: the platform
already enforces out-of-stock prevention, surfaces low-stock warnings, and
records a full movement history.** The one gap — the history wasn't *readable*
via the API — was closed this phase. No other changes were needed (and none were
added, per scope).

---

## Audit results

| Capability | Status | Where |
|------------|:------:|-------|
| **Out-of-stock prevention** | ✅ Built | `cart.js` rejects adds beyond stock (`409 Only N in stock`); cart merge caps at `stock`; checkout decrements atomically |
| **Low-stock warning** | ✅ Built | per-variant `low_stock_at` (default 5); `lowStock` flag in product API; Admin dashboard count; `GET /api/admin/alerts` low-stock list; inventory CSV export |
| **Inventory history** | ✅ Built (write) + **✅ now readable** | `inventory_log` written on **order**, **cancel/refund**, **manual** and **bulk** adjustments; new `GET /api/admin/inventory/history` exposes it |
| **Adjustments + reasons** | ✅ Built | `PATCH /api/admin/inventory/:id` with `reason`; bulk `PATCH /api/admin/bulk/inventory` |
| **Stock restore on refund/cancel** | ✅ Built + verified | refund restocks units (proven in journey sim + `flow.test.js`) |

### Fix made this phase
`GET /api/admin/inventory/history` — returns recent movements
(`delta`, `reason`, `ref`, `created_at`, product/variant) for all variants or a
single `?variantId=`. The data was already captured on every stock change; it
just had no read path. Covered by a new test in `flow.test.js`.

---

## How stock moves (the ledger)

Every change writes one `inventory_log` row with a **signed delta** and a
**reason**:

| Event | Delta | Reason |
|-------|:-----:|--------|
| Order placed | −qty | `order` |
| Order cancelled / refunded | +qty | `cancel` |
| Manual admin adjustment | ±diff | `adjustment` (or your note) |
| Bulk adjustment | ±diff | `bulk adjustment` |
| Restock | +diff | `restock` (set the reason) |

This is a complete audit trail — current stock always reconciles to the sum of
deltas.

---

## Daily operating procedure

1. **Check low-stock** each morning: `GET /api/admin/alerts` (or dashboard
   count). Anything at/near `low_stock_at` → reorder or restock.
2. **Restock** via `PATCH /api/admin/inventory/:variantId` with the new absolute
   `stock` and a `reason` (e.g. `restock PO#123`) so the ledger stays meaningful.
3. **Tune thresholds:** set `low_stock_at` per variant to your lead time
   (fast-selling / long-lead items → higher threshold).
4. **Audit when numbers look off:** `GET /api/admin/inventory/history?variantId=…`
   shows exactly what moved stock and why.
5. **Never oversell:** the cart/checkout already block it — keep the "Only N
   left" urgency honest; don't manually inflate stock.

## Reorder guidance

- **Reorder point ≈** average daily units × supplier lead-time days + safety
  buffer. Start conservative; refine with sell-through from Admin → Analytics.
- Watch **best sellers** (Aspen Merino Knit, Trailhead Harness, Cloud
  Orthopedic Lounger) — stocking out on a hero SKU during an ad push wastes
  spend. Prioritize their buffers.
- **Slow movers:** consider bundling (see `REVENUE_GROWTH_REPORT.md`) rather
  than deep discounting.

## Pre-launch inventory checklist

- [ ] Every active variant has a real, accurate `stock` count.
- [ ] `low_stock_at` set sensibly per variant (default 5).
- [ ] Best-seller buffers sized for launch + ad traffic.
- [ ] `GET /api/admin/alerts` reviewed; nothing unintentionally at 0.
- [ ] Confirm restock → `inventory_history` reflects the change.

## Optional future enhancements (not built — only if the need is real)

- Email/Slack push on low-stock (today it's dashboard/API pull) — wire
  `/api/admin/alerts` into a cron + `mailer.send`.
- Back-in-stock customer notifications.
- Supplier PO tracking.

These are deliberately **not** added now (scope: don't add unnecessary features);
the pull-based alert list covers launch needs.
