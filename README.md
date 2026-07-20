# Loomipaw — Standalone Premium Pet Lifestyle eCommerce

> _Designed for the bond between you and your best friend._

Loomipaw is a **complete, self-hosted online store** — a luxury pet lifestyle brand with a
full custom storefront **and** a real backend (database, REST API, authentication, payments,
admin panel, email, media pipeline). It runs entirely on its own with **no Shopify, no
WooCommerce, no hosted commerce platform** — just Node.js and a SQLite database file.

Everything is functional: browse → cart → secure checkout → order → account, plus a full
admin dashboard to run the business. The dev payment provider simulates real success/failure
so the entire purchase flow works with **zero third-party credentials**; swapping in Stripe is
a config change, not a code change.

---

## Quick start

```bash
npm install          # install dependencies
cp .env.example .env # (optional) adjust config — defaults work out of the box
npm run setup        # create the database schema + seed catalogue & admin
npm start            # start the server
```

Then open:

- **Storefront** → http://localhost:4000
- **Admin panel** → http://localhost:4000/admin  (login `admin@loomipaw.com` / `Admin123!change`)

Run the automated end-to-end API test against a running server:

```bash
npm run test:api     # 27 checks: auth, cart, coupons, checkout (success + decline), admin…
```

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js + Express | Ubiquitous, dependency-light |
| Database | **SQLite** via `better-sqlite3` | A real SQL database in a single file — zero external services, fully standalone, easy to back up |
| Auth | JWT (httpOnly cookie) + `bcryptjs` | Secure sessions, hashed passwords |
| Validation | `zod` | Strict typed request validation |
| Security | `helmet`, CSRF double-submit, `express-rate-limit` | Headers/CSP, CSRF, throttling |
| Images | `sharp` | Auto-optimized WebP + responsive sizes |
| Email | `nodemailer` | SMTP in prod, `.eml` files in dev |
| Frontend | Vanilla HTML/CSS/JS | No framework, fast, no build step |

No build step. No bundler. Deploy the folder + run `npm start`.

---

## Features (all operational)

**Storefront** — catalogue with filter/sort/search · product pages with gallery, variant
selection, live stock, reviews · server-side cart with free-shipping progress · secure
checkout · customer accounts (register/login/logout/password reset) · order history &
tracking · wishlist · profile management · newsletter · contact form · fully responsive,
accessible (skip links, ARIA, reduced-motion, keyboard), SEO (meta, Open Graph, JSON-LD).

**Admin** (`/admin`) — dashboard with revenue chart, AOV, top products · products CRUD with
**drag-and-drop image upload** · category management · inventory editor with low-stock
flags · order processing & status changes (emails the customer) · customer directory ·
discount-code creation · reviews moderation · contact messages · shipping / tax / payment /
store settings.

**Engine** — coupon system (percent / fixed / free-shipping, min-spend, usage limits) ·
configurable shipping methods + free-shipping threshold · tax rate · atomic checkout that
reserves stock in a transaction and restocks on failure/cancel · payment abstraction ·
inventory movement log · order-confirmation & status emails.

---

## Project structure

```
├── server/                 # Backend (Express + SQLite)
│   ├── index.js            # Entry — migrates DB, starts server
│   ├── app.js              # Express app: security, static, API mount
│   ├── config.js           # Env-driven config with safe defaults
│   ├── db/
│   │   ├── schema.sql      # 18-table schema
│   │   ├── index.js        # Shared connection
│   │   ├── migrate.js      # Apply schema (idempotent)
│   │   └── seed.js         # Catalogue, admin, coupons, reviews
│   ├── middleware/         # auth · csrf · validate · rateLimit · error
│   ├── lib/
│   │   ├── payments/       # Abstraction: dev (simulated) + stripe adapter
│   │   ├── mailer/         # Abstraction: dev (.eml) + SMTP + templates
│   │   ├── media.js        # sharp → responsive WebP pipeline
│   │   ├── logger.js       # Structured logging (console + file)
│   │   └── util.js         # HttpError, money, slugify, tokens
│   ├── services/           # catalog · cart · orders · coupons · settings
│   ├── routes/             # auth · products · cart · checkout · orders ·
│   │                       #   reviews · wishlist · misc · admin
│   └── test/e2e.js         # End-to-end API test
├── public/                 # Frontend (served by Express)
│   ├── index.html          # Homepage
│   ├── collection.html     # Shop with filter/sort
│   ├── product.html        # Product detail
│   ├── cart / checkout / search / contact / 404
│   ├── account/            # login · register · forgot · reset · dashboard · order · track
│   ├── admin/              # Admin SPA (index.html · admin.js · admin.css)
│   └── assets/{css,js,img} # Design system, page scripts, brand imagery
├── data/                   # SQLite database (created at runtime, gitignored)
├── uploads/                # Uploaded product images (gitignored)
├── var/{logs,mail}         # Logs and dev email output (gitignored)
└── .env.example            # Configuration template
```

---

## API overview (REST, JSON)

Public: `GET /api/products`, `GET /api/products/:slug`, `GET /api/categories`,
`GET /api/search`, `GET /api/settings`, cart (`/api/cart` …), `POST /api/checkout`,
`POST /api/newsletter`, `POST /api/contact`, reviews.

Auth: `POST /api/auth/{register,login,logout,forgot-password,reset-password,change-password}`,
`GET|PATCH /api/auth/me`.

Account: `GET /api/orders`, `GET /api/orders/:number`, wishlist.

Admin (require `role=admin`): `/api/admin/{stats,products,products/:id/images,categories,
inventory,orders,customers,coupons,reviews,messages,settings}`.

All mutating requests require the CSRF header `x-csrf-token` (issued as the `lp_csrf` cookie;
the frontend client handles this automatically).

---

## Payments — connecting a real gateway

The checkout calls a provider-agnostic interface
(`createPaymentIntent` → `confirmPayment` → `refund`), so **the checkout flow never changes**
when you swap gateways.

- **Default (`dev`)** — simulates a gateway. Test cards: `4242 4242 4242 4242` succeeds,
  `4000 0000 0000 0002` is declined, `4000 0000 0000 9995` = insufficient funds.
- **Stripe** — set in `.env`:
  ```
  PAYMENT_PROVIDER=stripe
  STRIPE_SECRET_KEY=sk_live_or_test_...
  STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
  then `npm install stripe` and uncomment the client in
  `server/lib/payments/stripe.js`. The adapter is already written.

---

## Where to add third-party credentials

Everything runs without them; add these only when you want live integrations
(clearly marked in `.env.example`):

| Integration | Env vars | Code location |
|-------------|----------|---------------|
| Stripe payments | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | `server/lib/payments/stripe.js` |
| SMTP email | `MAIL_TRANSPORT=smtp`, `SMTP_HOST/PORT/USER/PASS` | `server/lib/mailer/index.js` |
| Secrets | `JWT_SECRET` (change in production!) | `server/config.js` |

Until SMTP is configured, all emails (welcome, password reset, order confirmation, status
updates) render to `var/mail/*.eml` so you can inspect them.

---

## Security notes

- Passwords hashed with bcrypt (cost 12); login is constant-work to resist enumeration.
- JWT stored in an httpOnly, SameSite=Lax cookie; `secure` in production.
- CSRF protection on all state-changing routes (double-submit cookie).
- Zod validation on every input; rate limiting on auth & write endpoints.
- Helmet security headers + Content-Security-Policy.
- **Before deploying:** set a strong `JWT_SECRET`, change the admin password, run behind
  HTTPS (`NODE_ENV=production`), and back up `data/loomipaw.db`.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start the server |
| `npm run dev` | Start with file-watch reload |
| `npm run migrate` | Create/upgrade the database schema |
| `npm run seed` | Seed catalogue, admin, coupons, reviews |
| `npm run setup` | migrate + seed |
| `npm run test:api` | Run the end-to-end API test |

© 2026 Loomipaw. Crafted with love for good dogs everywhere.
