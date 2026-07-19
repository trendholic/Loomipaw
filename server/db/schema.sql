-- =====================================================================
-- Loomipaw database schema (SQLite)
-- All monetary values stored as integer cents. Timestamps are ISO-8601
-- text in UTC. JSON blobs stored as TEXT.
-- =====================================================================
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- Users
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'customer',      -- customer | admin
  address_json   TEXT NOT NULL DEFAULT '{}',            -- default shipping address
  reset_token    TEXT,
  reset_expires  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reset ON users(reset_token);

-- ----------------------------------------------------------- Categories
CREATE TABLE IF NOT EXISTS categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  image        TEXT NOT NULL DEFAULT '',
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- Products
CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  subtitle          TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  details           TEXT NOT NULL DEFAULT '',      -- materials / care (markdown-ish)
  price_cents       INTEGER NOT NULL DEFAULT 0,
  compare_at_cents  INTEGER,                        -- null = not on sale
  status            TEXT NOT NULL DEFAULT 'active', -- active | draft | archived
  featured          INTEGER NOT NULL DEFAULT 0,
  best_seller       INTEGER NOT NULL DEFAULT 0,
  tag               TEXT NOT NULL DEFAULT '',       -- New | Sale | Best Seller | ''
  tax_class         TEXT NOT NULL DEFAULT 'standard',
  seo_title         TEXT NOT NULL DEFAULT '',
  seo_description   TEXT NOT NULL DEFAULT '',
  rating_avg        REAL NOT NULL DEFAULT 0,        -- cached from approved reviews
  rating_count      INTEGER NOT NULL DEFAULT 0,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE TABLE IF NOT EXISTS product_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,          -- base (largest) image path
  srcset_json TEXT NOT NULL DEFAULT '[]',  -- responsive variants [{w,url}]
  alt         TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

-- Variants carry stock (inventory) and optional per-variant pricing.
CREATE TABLE IF NOT EXISTS variants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku          TEXT NOT NULL UNIQUE,
  color        TEXT NOT NULL DEFAULT '',
  color_hex    TEXT NOT NULL DEFAULT '',
  size         TEXT NOT NULL DEFAULT '',
  price_cents  INTEGER,               -- null = inherit product price
  stock        INTEGER NOT NULL DEFAULT 0,
  low_stock_at INTEGER NOT NULL DEFAULT 5,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

-- --------------------------------------------------------------- Carts
CREATE TABLE IF NOT EXISTS carts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL UNIQUE,   -- opaque cookie token for guests
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id     INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id  INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 1,
  UNIQUE(cart_id, variant_id)
);

-- -------------------------------------------------------------- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  number            TEXT NOT NULL UNIQUE,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',      -- pending|paid|processing|fulfilled|shipped|delivered|cancelled|refunded
  financial_status  TEXT NOT NULL DEFAULT 'unpaid',       -- unpaid|paid|refunded|failed
  subtotal_cents    INTEGER NOT NULL DEFAULT 0,
  discount_cents    INTEGER NOT NULL DEFAULT 0,
  shipping_cents    INTEGER NOT NULL DEFAULT 0,
  tax_cents         INTEGER NOT NULL DEFAULT 0,
  total_cents       INTEGER NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  coupon_code       TEXT NOT NULL DEFAULT '',
  shipping_method   TEXT NOT NULL DEFAULT '',
  shipping_json     TEXT NOT NULL DEFAULT '{}',
  billing_json      TEXT NOT NULL DEFAULT '{}',
  payment_provider  TEXT NOT NULL DEFAULT '',
  payment_ref       TEXT NOT NULL DEFAULT '',
  tracking_number   TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id        INTEGER REFERENCES variants(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  variant_label     TEXT NOT NULL DEFAULT '',
  sku               TEXT NOT NULL DEFAULT '',
  image             TEXT NOT NULL DEFAULT '',
  unit_price_cents  INTEGER NOT NULL DEFAULT 0,
  qty               INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Payment transactions (audit trail for the payment abstraction layer)
CREATE TABLE IF NOT EXISTS payments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  provider_ref  TEXT NOT NULL DEFAULT '',
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending|succeeded|failed|refunded
  raw_json      TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- Inventory movement log
CREATE TABLE IF NOT EXISTS inventory_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id  INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',     -- order|restock|adjustment|cancel
  ref         TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name  TEXT NOT NULL DEFAULT 'Anonymous',
  rating       INTEGER NOT NULL DEFAULT 5,
  title        TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  verified     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- ------------------------------------------------------------- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  type              TEXT NOT NULL DEFAULT 'percent',   -- percent | fixed
  value             INTEGER NOT NULL DEFAULT 0,        -- percent (0-100) or cents
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  free_shipping     INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1,
  starts_at         TEXT,
  ends_at           TEXT,
  usage_limit       INTEGER NOT NULL DEFAULT 0,        -- 0 = unlimited
  used_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------ Wishlist
CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

-- ---------------------------------------------------------- Newsletter
CREATE TABLE IF NOT EXISTS newsletter (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  confirmed   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------- Contact forms
CREATE TABLE IF NOT EXISTS contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',   -- new | read | closed
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------ Settings
-- Key/value store for store settings (shipping rates, tax, store info…)
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',   -- JSON
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
