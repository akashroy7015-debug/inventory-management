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
| **Amazon / Flipkart** | Upload order reports (Amazon `.txt`, Flipkart `.csv`) → orders created & stock deducted; duplicates/cancelled skipped. Download stock files (stock − buffer) to update listings |
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

Checks: `npm run typecheck`, `npm run lint`, `npm test`.

## Deploy (publish for everyone)

**Option A — Vercel + Neon (easiest, free tiers available)**
1. Create a Postgres database at [neon.tech](https://neon.tech) (or Supabase) and copy its connection string.
2. Import this GitHub repo in [vercel.com](https://vercel.com). Add env vars `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`) and `TZ=Asia/Kolkata`.
3. Set the build command to `npm run db:deploy && npm run build`.
4. Point a domain (e.g. `app.yourbrand.in`) at the Vercel project.

**Option B — any VPS with Docker**
```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env
docker compose up -d --build    # app on :3000, Postgres in a volume
```
Put Nginx/Caddy in front for HTTPS.

## Website API

Find your key under **Website API** in the app. All calls use `Authorization: Bearer <key>` and must be made from your server, not the browser.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/stock?channel=website&sku=MOR-250` | Sellable quantity per SKU (stock at channel location − buffer) |
| `POST` | `/api/v1/orders` | Record an order and deduct stock. Idempotent on `order_id` |
| `POST` | `/api/v1/orders/cancel` | Cancel an order and return its stock |

## Roadmap

- Direct Amazon SP-API and Flipkart Seller API sync (needs developer approval from each marketplace)
- Shopify app, purchase orders & suppliers, email/WhatsApp low-stock alerts, subscription billing for the SaaS
