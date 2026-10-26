# Island Taste Phase 1 demonstration

The original static website remains intact in `index.html`, `css/`, `js/`, and `images/`. The new application incrementally adds Astro server routes, React interactive views, TypeScript domain logic, and Tailwind 4 with a custom responsive design system. `/story.html` preserves the original community/mission site. No production deployment or payment activation has occurred.

## Run

Node 22.12+ (Node 24 tested), npm, and a writable persistent disk are required.

```sh
npm ci
npm run staff:demo
npm run build
HOST=127.0.0.1 PORT=4321 npm start
```

Run `staff:demo` once on a fresh database, with the server stopped. It generates a random staff password in ignored, mode-0600 `.data/demo-access.json`; read it locally to sign in at `/staff`. Never commit, publish, or share that file. The prepared environment already has this account. There is no shared default password. For managed accounts set `STAFF_USERNAME` and `STAFF_PASSWORD` securely and run `npm run staff:create` with the server stopped. Passwords must be at least 12 characters. Updating an account revokes its sessions. Do not place credentials in command history or source files.

For development: `npm run dev`. Customer ordering is at `/`; operations at `/staff`. A persistent server is required: the original static-file server cannot run the API. The `netlify.toml` now configures dynamic Astro deployment; see NETLIFY-DEPLOYMENT.md. Do not use drag-and-drop source deployment for this app. For any future host, configure a Node process, persistent disk, HTTPS and exact `APP_ORIGIN` before building. Local hostnames are allowlisted on port 4321. No deployment is authorized by this demonstration.

## Architecture and data

`src/lib/db.ts` bootstraps versioned SQL schema migration 1 and seeds only missing menu/settings rows. PGlite is actual PostgreSQL compiled to WASM, persisted on disk, not browser storage or an in-memory order store. `DATA_DIR` defaults to `.data/`; retain this directory across restarts. One Node process must own it; stop the server before running account scripts or a second process using that directory. For Netlify and multiple function instances, set DATABASE_URL or NETLIFY_DATABASE_URL: src/lib/database.ts selects a TLS-verified PostgreSQL pool, with transactional schema and checkout advisory locks. Local development without a hosted connection still uses single-process PGlite. Existing local test orders are not migrated into the hosted database. SQL tables hold menus, restaurant configuration, staff password hashes, expiring sessions, login-attempt limits, orders, and status audit events. Orders retain immutable price/item snapshots and distinct demo payment status. No real payment data is collected.

Staff authentication uses salted scrypt hashes, random session tokens stored only as hashes, 8-hour HttpOnly SameSite cookies (Secure over HTTPS), server authorization and origin checks on mutations, and per-account login throttling. Staff accounts currently share an operations role. Staff page is a public sign-in shell; its data and mutations require authorization. Menu and settings are persistent. Dashboard polls every 5 seconds, displays latest 300 orders and supports optional audio after a user gesture. Do not enable sound on unattended public devices. Public checkout and menu never expose other customers' stored orders. Customer session storage contains only cart, submission token, and their own receipt for refresh continuity; accepted orders live in the database.

Checkout validates contacts, modifiers, availability, quantities, scheduling and final integer-cent prices server-side. A unique idempotency key and payload fingerprint prevent duplicate retries or conflicting replays. Two-side meals require exactly two distinct available sides and an explicitly configured total. Initial meat prices are à la carte only; no unconfirmed bundle pricing is seeded. Rice & Peas has a coconut notice independently enforced in cart/order snapshots. Orders are accepted as **stored test orders**, never as paid meals. All real-order requests fail closed. Closed periods and temporary closures block scheduling; future pickup can be allowed up to seven days. Demo defaults permit advance scheduling so the demonstration works outside today's hours. Initial tax/fees are explicitly unconfirmed zero placeholders, configurable by staff.

## Review stages

- Foundation: original assets retained; schema and application separated into `src/lib`, API routes and components.
- Ordering: category filters, previews, meal customization, session cart, checkout, server pricing, stored confirmation.
- Operations: sign-in, persistent order board, enforced sequential preparation states/cancellation, immutable payment status, menu and hours editors, audit records.
- QA: unit, browser, accessibility and restart verification described below.
- Owner review: design, food photography rights/quality, à la carte/bundle prices, tax/fees, hours and pickup policy must be approved before real service.

The menu editor supports editing existing item names, descriptions, categories, image selections, prices, availability and confirmed meal combinations; creating entirely new items/categories is a future extension. Existing food images are reused; no new photography or licensing claims are introduced. Existing logo/flag assets are retained. The homepage visit details show standard published hours; ordering eligibility uses staff-configured hours. No customer notifications, receipt printing, live refunds, or live PayPal calls are implemented.

## Validation

```sh
npm run check
npm test
npm run build
# With the built server running and the local demo account created:
node tests/e2e.cjs
node tests/accessibility.cjs
node tests/safety.cjs
# After stopping and restarting the server:
node tests/recovery.cjs
```

Browser checks require Playwright and system Chromium at `/usr/bin/chromium` (available here). On another development machine install Chromium using the platform's supported package manager or adjust the test executable path. E2E is for the demonstration database only: it creates clearly labeled test orders, temporarily enables advance scheduling and sets a $21 combination price purely as a test fixture, then restores the original bundle pricing and restaurant settings. It exercises responsive customer ordering, persisted confirmation, staff polling/status lifecycle, authorization, origin checks, idempotency, forged-price resistance, invalid side rejection and live-payment rejection. Automated accessibility scans cover customer homepage, staff sign-in and authenticated board. Screenshots are written to ignored `.data/mobile.png` and `.data/desktop.png`. Restart validation independently logs in and verifies `.data/acceptance-order.json` still exists with its saved completed/unpaid status after restarting the Node process. The four domain tests cover pricing, modifiers, Eastern/DST hours, password verification and disabled payment methods. Automated scans do not replace manual screen reader/device review.

## PayPal next phase

`src/lib/payments.ts` defines the provider boundary; `/api/payments/*` returns a disabled response. Owner approval is required before implementing or activating live payments. Supply credentials securely through environment settings (never in browser code): PayPal client ID, server secret, environment and webhook ID. Implement provider order creation, approval/capture, signature verification, replay-resistant event storage, reconciliation, failure/cancellation/refund transitions, provider idempotency, and sandbox integration tests. Verify captured amount/currency/order binding on the server before marking any order paid. The disabled methods are scaffolding, not a completed payment integration. A production rollout also requires network PostgreSQL/backups, retention/privacy policy, real account provisioning, operational monitoring, abuse controls, verified tax/fee configuration, HTTPS and a deployment review.

Verified in this environment: frozen `npm ci`, TypeScript check, production build, 4/4 domain tests, mobile/browser E2E, three accessibility scans, API safety checks, and order recovery after server restart. No live PayPal or production-host validation was run.

## Original visual design restored

The ordering app imports the original `css/styles.css`, with ordering-specific adaptations in `src/styles/heritage.css` and reusable brand sections in `src/components/Heritage.tsx`. The original teal hero, sun, palm artwork, wave dividers, flag ribbon, colorful meal cards, green sides panel, teal drinks panel, community mission and visit sections are restored. Shrikhand, Lilita One and Instrument Sans are served locally through Fontsource packages. The cart, checkout and staff tools use the same brand palette and type. The Google Maps embed is optional; the address and external directions link remain visible without it. The original HTML/CSS/assets are unchanged.

Netlify deployment preparation and remaining account prerequisites are documented in NETLIFY-DEPLOYMENT.md. The PostgreSQL adapter and Netlify build were verified; no live publication has occurred.
