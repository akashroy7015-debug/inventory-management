import { headers } from "next/headers";
import { requireOrg } from "@/lib/auth";
import { ActionForm, Submit } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { Card, PageHeader } from "@/components/ui";
import { regenerateApiKey } from "../settings/actions";

export const metadata = { title: "Website API" };

function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2"><CopyButton text={children} /></div>
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 pr-20 text-xs leading-relaxed text-slate-100">{children}</pre>
    </div>
  );
}

export default async function DevelopersPage() {
  const { org, role } = await requireOrg();
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const key = role === "STAFF" ? "sk_your_api_key" : org.apiKey;

  const curlStock = `curl "${base}/api/v1/stock?channel=website" \\
  -H "Authorization: Bearer ${key}"`;
  const curlOrder = `curl -X POST "${base}/api/v1/orders" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "website",
    "order_id": "WEB-1001",
    "payment_status": "PAID",
    "customer": { "name": "Asha Rao", "phone": "9876543210", "state": "Karnataka", "address": "12 MG Road, Bengaluru 560001" },
    "items": [ { "sku": "MOR-250", "quantity": 2, "price": 299 } ]
  }'`;
  const php = `<?php
// WooCommerce: add to your theme's functions.php (or a small plugin).
// Sends every paid order to ${org.name}'s inventory and cancels it if the order is cancelled.
const STOCKHUB_URL = '${base}';
const STOCKHUB_KEY = '${key}';

function stockhub_post($path, $body) {
  wp_remote_post(STOCKHUB_URL . $path, [
    'headers' => ['Authorization' => 'Bearer ' . STOCKHUB_KEY, 'Content-Type' => 'application/json'],
    'body'    => wp_json_encode($body),
    'timeout' => 15,
  ]);
}

add_action('woocommerce_order_status_processing', function ($order_id) {
  $o = wc_get_order($order_id);
  $items = [];
  foreach ($o->get_items() as $item) {
    $p = $item->get_product();
    $items[] = ['sku' => $p ? $p->get_sku() : '', 'quantity' => $item->get_quantity(),
                'price' => round(($item->get_total() + $item->get_total_tax()) / max(1, $item->get_quantity()), 2)];
  }
  stockhub_post('/api/v1/orders', [
    'channel' => 'website', 'order_id' => (string) $o->get_order_number(),
    'payment_status' => $o->get_payment_method() === 'cod' ? 'COD' : 'PAID',
    'shipping_fee' => (float) $o->get_shipping_total(),
    'customer' => ['name' => $o->get_formatted_billing_full_name(), 'phone' => $o->get_billing_phone(),
                   'email' => $o->get_billing_email(), 'state' => WC()->countries->get_states('IN')[$o->get_shipping_state()] ?? '',
                   'address' => implode(', ', array_filter([$o->get_shipping_address_1(), $o->get_shipping_city(), $o->get_shipping_postcode()]))],
    'items' => $items,
  ]);
});

add_action('woocommerce_order_status_cancelled', function ($order_id) {
  stockhub_post('/api/v1/orders/cancel', ['channel' => 'website', 'order_id' => (string) wc_get_order($order_id)->get_order_number()]);
});`;
  const node = `// Node.js / Next.js / Express — call from your server, never from the browser.
await fetch("${base}/api/v1/orders", {
  method: "POST",
  headers: { Authorization: "Bearer " + process.env.STOCKHUB_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    channel: "website",
    order_id: order.id,
    payment_status: "PAID",
    customer: { name: order.name, phone: order.phone, state: order.state, address: order.address },
    items: order.items.map((i) => ({ sku: i.sku, quantity: i.qty, price: i.price })),
  }),
});`;

  return (
    <>
      <PageHeader title="Website API" subtitle="Connect your own website so orders deduct stock automatically and product pages show live availability." />
      <div className="space-y-6">
        <Card title="Your API key">
          {role === "STAFF" ? (
            <p className="text-sm text-slate-600">Ask the account owner or an admin for the API key.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-slate-100 px-3 py-2 font-mono text-sm">{org.apiKey}</code>
                <CopyButton text={org.apiKey} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Keep this secret — use it only from your website&apos;s server code. Anyone with the key can record orders for your business.</p>
              {role === "OWNER" && (
                <ActionForm action={regenerateApiKey} className="mt-3">
                  <Submit className="btn btn-sm btn-danger" confirm="The old key stops working immediately. Continue?">Regenerate key</Submit>
                </ActionForm>
              )}
            </>
          )}
        </Card>
        <Card title="1 · Read live stock">
          <p className="mb-3 text-sm text-slate-600">Returns sellable quantity per SKU (stock at the channel&apos;s location minus its safety buffer). Add <code>&amp;sku=MOR-250</code> for one product. Use it to show “In stock / Out of stock” or hide the Buy button.</p>
          <Code>{curlStock}</Code>
        </Card>
        <Card title="2 · Send an order">
          <p className="mb-3 text-sm text-slate-600">Call this when a customer pays (or confirms COD). Stock is deducted first-expiry-first-out. Sending the same <code>order_id</code> twice is safe — it won&apos;t double-count. <code>sku</code> can be your SKU code, barcode, or the website SKU mapped under Channels → Website.</p>
          <Code>{curlOrder}</Code>
        </Card>
        <Card title="3 · Cancel an order">
          <Code>{`curl -X POST "${base}/api/v1/orders/cancel" \\
  -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" \\
  -d '{ "channel": "website", "order_id": "WEB-1001" }'`}</Code>
        </Card>
        <Card title="WooCommerce / WordPress">
          <Code>{php}</Code>
        </Card>
        <Card title="Custom website (Node.js)">
          <Code>{node}</Code>
          <p className="mt-3 text-xs text-slate-500">Responses: <code>201</code> created · <code>200</code> with <code>duplicate: true</code> if already received · <code>401</code> bad key · <code>422</code> unknown SKU.</p>
        </Card>
      </div>
    </>
  );
}
