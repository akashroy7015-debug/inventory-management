# StockHub — centralised multichannel inventory

A multi-tenant SaaS for D2C brands that sell on their **own website, Amazon, Flipkart, Meesho and offline**.
Anyone can sign up, create a business workspace, and manage one live stock count across every channel.
Built first for **Moriveda** (moringa products), but works for any brand and any number of products.

## Features

| Area | What you get |
|---|---|
| **Accounts** | Sign up / log in, multiple businesses per login, team members with Owner / Admin / Staff roles |
| **Products** | Products with multiple variants (SKUs): MRP, selling & cost price, barcode, HSN, GST rate, reorder level |
| **Inventory** | Stock per SKU × location, stock in (purchase / production / return / opening), stock-take adjustments, damage write-offs, transfers between locations (e.g. warehouse → Amazon FBA), full audit ledger |
| **Batches & expiry** | Batch no., mfg & expiry dates; sales are allocated **first-expiry-first-out**; 30/60/90-day expiry views |
| **Channels** | Website, Amazon, Flipkart, Offline + custom channels; per-channel fulfilment location and safety buffer; SKU mapping (Seller SKU, ASIN, FSN) |
| **Orders** | Unified order list across channels, status flow (cancel/return restocks automatically), payment status |
| **Marketplace connections** | Each business connects its **own** Amazon (SP-API), Flipkart (Seller API), Shopify and WooCommerce accounts. Orders are pulled in automatically (cancellations restock), and stock is pushed to every connected marketplace whenever it changes anywhere — POS sale, stock-in, website order or another marketplace's order. Credentials are AES-256-GCM encrypted; listings are auto-linked by SKU; full sync log per channel |
| **Amazon / Flipkart files** | Upload order reports (Amazon `.txt`, Flipkart `.csv`) → orders created & stock deducted; duplicates/cancelled skipped. Download stock files (stock − buffer) to update listings |
| **Website** | REST API with per-business API key: read live stock, push orders (idempotent), cancel orders. WooCommerce snippet included in-app |
| **Offline POS** | Counter billing with search / barcode scan, prints GST tax invoice (CGST+SGST or IGST, amount in words) |
| **Reports** | Sales by channel & product, GST summary by rate, margin, stock valuation, slow movers, sales register CSV |

## Tech

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma · Vitest.
Every business record carries `organizationId`, and every query is scoped to the logged-in user's business.

## Run locally

```bash
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET
npm install
npm run db:deploy               # create tables
npm run db:seed                 # optional demo: demo@moriveda.in / demo1234
npm run dev                     # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`. In production, `GET /api/health` reports whether the database and required env vars are set up.

## Deploy (publish for everyone)

**Option A — Vercel + Neon (easiest, free tiers available)**
1. Create a Postgres database at [neon.tech](https://neon.tech) (or Supabase) and copy its connection string.
2. Import this GitHub repo in [vercel.com](https://vercel.com). Add env vars `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `CRON_SECRET` (`openssl rand -hex 24`) and `TZ=Asia/Kolkata`.
3. Leave the build command on Vercel's default: the `vercel-build` script (`scripts/vercel-build.mjs`) applies database migrations on production deploys before building; preview deploys skip migrations.
4. Point a domain (e.g. `app.yourbrand.in`) at the Vercel project.
5. Schedule marketplace syncing: Vercel's free plan runs `vercel.json`'s cron once a day, so also create a free job at [cron-job.org](https://cron-job.org) that calls `https://<your-app>/api/cron/sync` every 10 minutes with header `Authorization: Bearer <CRON_SECRET>`. (On Vercel Pro you can change the schedule in `vercel.json` to `*/10 * * * *` instead.)

**Option B — any VPS with Docker**
```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env
echo "CRON_SECRET=$(openssl rand -hex 24)" >> .env
docker compose up -d --build    # app on :3000, Postgres in a volume, marketplace sync every 10 min
```
Put Nginx/Caddy in front for HTTPS.

## Website API

Find your key under **Website API** in the app. All calls use `Authorization: Bearer <key>` and must be made from your server, not the browser.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/stock?channel=website&sku=MOR-250` | Sellable quantity per SKU (stock at channel location − buffer) |
| `POST` | `/api/v1/orders` | Record an order and deduct stock. Idempotent on `order_id` |
| `POST` | `/api/v1/orders/cancel` | Cancel an order and return its stock |

## Marketplace connections

Open **Channels → (channel) → Connect your account**. The form shows step-by-step instructions for getting credentials from each marketplace:

| Platform | What the seller needs | Orders in | Stock out |
|---|---|---|---|
| Amazon (SP-API) | Seller ID, LWA client ID/secret, refresh token (private developer app in Seller Central) | Orders API, incl. cancellations; FBA orders optional, deducted from a chosen location | Listings Items API `fulfillment_availability` |
| Flipkart | Application ID/secret from the Seller API portal, pickup location ID | Shipments filter API (open + cancelled) | Listings v3 inventory update (by FSN) |
| Shopify | Store address + Admin API token from a custom app | Orders API (cancel/refund → restock) | `inventory_levels/set` |
| WooCommerce | Site URL + REST API consumer key/secret (Read/Write) | Orders API (`modified_after`) | Products / variations batch update |

How syncing works:
- `/api/cron/sync` (protected by `CRON_SECRET`) imports new orders and pushes changed quantities for every connected channel.
- Any stock change inside the app (POS, stock-in, website API order, imports) pushes the new quantities right after the response is sent.
- Only SKUs linked to a listing are pushed; **Match listings** links them automatically when the marketplace SKU equals your SKU code or barcode, otherwise map them in the SKU mapping table.
- Overlapping syncs are prevented with a per-connection lock; re-importing the same orders is always safe.
- Store URLs that resolve to private/internal addresses are refused.

Optional env vars: `ENCRYPTION_KEY` (separate key for stored credentials; defaults to `AUTH_SECRET` — don't change it after connecting accounts, or sellers must re-enter credentials) and `SHOPIFY_API_VERSION`.

## Roadmap

- Meesho (no public seller API yet — file import works today), Shopify/Amazon webhooks for instant order delivery
- Purchase orders & suppliers, email/WhatsApp low-stock alerts, subscription billing for the SaaS
