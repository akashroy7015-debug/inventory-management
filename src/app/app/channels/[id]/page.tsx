import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelAvailability } from "@/lib/stock";
import { ActionForm, Submit } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { ChannelFields } from "../channel-fields";
import { ConnectionCard } from "../connection-card";
import { importOrders, saveMappings, updateChannel } from "../actions";

const HELP: Record<string, { report: string; ext: string; idLabel: string }> = {
  AMAZON: {
    report: "Seller Central → Reports → Fulfilment → All Orders (or Order Reports → New Orders). Download the .txt file and upload it here.",
    ext: "Seller SKU",
    idLabel: "ASIN",
  },
  FLIPKART: {
    report: "Seller Hub → Orders → Active / Completed orders → Download. Upload the CSV / Excel-saved-as-CSV file here.",
    ext: "Seller SKU ID",
    idLabel: "FSN / Listing ID",
  },
  WEBSITE: {
    report: "Export orders from your store (Shopify, WooCommerce…) as CSV — or connect it live with the Website API.",
    ext: "Website SKU",
    idLabel: "Product ID",
  },
};

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId, role } = await requireOrg();
  const { id } = await params;
  const channel = await db.channel.findFirst({ where: { id, organizationId: orgId }, include: { connection: true } });
  if (!channel) notFound();
  const [locations, rows, logs] = await Promise.all([
    db.location.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }),
    channelAvailability(orgId, channel.id),
    channel.connection
      ? db.syncLog.findMany({ where: { connectionId: channel.connection.id }, orderBy: { startedAt: "desc" }, take: 10 })
      : Promise.resolve([]),
  ]);
  const help = HELP[channel.type] ?? { report: "Upload a CSV with columns: order_id, order_date, sku, quantity, unit_price, customer_name.", ext: "Channel SKU", idLabel: "Listing ID" };
  const marketplace = channel.type !== "OFFLINE";

  return (
    <>
      <PageHeader title={channel.name} subtitle={<Link href="/app/channels" className="link">← All channels</Link>} />
      <div className="mb-6">
        <ConnectionCard channel={channel} connection={channel.connection} logs={logs} locations={locations} canEdit={role !== "STAFF"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Settings">
          <ActionForm action={updateChannel} className="space-y-3">
            <input type="hidden" name="id" value={channel.id} />
            <ChannelFields c={channel} locations={locations} />
            <p className="text-xs text-slate-500">The buffer is held back from the quantity you export/publish, so a few late orders never oversell.</p>
            <Submit>Save</Submit>
          </ActionForm>
        </Card>
        {marketplace && (
          <div className="space-y-6">
            <Card title={channel.connection ? "Import orders from a file (optional)" : "Import orders"}>
              <p className="mb-3 text-sm text-slate-600">{help.report}</p>
              <ActionForm action={importOrders} reset className="space-y-3">
                <input type="hidden" name="channelId" value={channel.id} />
                <input className="input" type="file" name="file" accept=".csv,.txt,.tsv,text/csv,text/plain" required />
                <Submit>Import & deduct stock</Submit>
              </ActionForm>
              <p className="mt-2 text-xs text-slate-500">Already-imported and cancelled orders are skipped automatically, so re-uploading the same report is safe.</p>
            </Card>
            <Card title="Export stock levels">
              <p className="mb-3 text-sm text-slate-600">Download available quantities (stock minus buffer) to update listings on {channel.name}.</p>
              <div className="flex flex-wrap gap-2">
                <a className="btn" href={`/app/channels/${channel.id}/export?format=csv`}><Download className="h-4 w-4" /> CSV (sku, quantity)</a>
                {channel.type === "AMAZON" && <a className="btn" href={`/app/channels/${channel.id}/export?format=amazon`}><Download className="h-4 w-4" /> Amazon inventory file (.txt)</a>}
                {channel.type === "FLIPKART" && <a className="btn" href={`/app/channels/${channel.id}/export?format=flipkart`}><Download className="h-4 w-4" /> Flipkart stock file</a>}
              </div>
            </Card>
          </div>
        )}
      </div>

      <Card title="SKU mapping & availability" className="mt-6" pad={false}>
        <ActionForm action={saveMappings}>
          <input type="hidden" name="channelId" value={channel.id} />
          <p className="px-5 pt-4 text-sm text-slate-600">If {channel.name} uses a different SKU code than yours, enter it here. Leave blank to use your own SKU code.</p>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Your SKU</th><th>Product</th><th>{help.ext}</th><th>{help.idLabel}</th><th className="text-right">On hand</th><th className="text-right">Available here</th>{channel.connection && <th className="text-right">Last sent</th>}</tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.skuId}>
                  <td className="font-mono text-xs">{r.sku}</td>
                  <td>{r.name}</td>
                  <td><input className="input font-mono text-xs" name={`ext_${r.skuId}`} defaultValue={r.externalSku === r.sku && !r.externalId ? "" : r.externalSku} placeholder={r.sku} /></td>
                  <td><input className="input font-mono text-xs" name={`id_${r.skuId}`} defaultValue={r.externalId ?? ""} /></td>
                  <td className="text-right">{r.onHand}</td>
                  <td className="text-right font-semibold">{r.available}</td>
                  {channel.connection && <td className="text-right text-slate-500">{r.mapped ? r.lastPushedQty ?? "—" : "not linked"}</td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="px-5 pb-4"><Submit>Save mappings</Submit></div>
        </ActionForm>
      </Card>
    </>
  );
}
