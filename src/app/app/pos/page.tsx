import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { OrderBuilder } from "../orders/order-builder";
import { builderData } from "../orders/builder-data";

export const metadata = { title: "Offline POS" };

export default async function PosPage() {
  const { orgId } = await requireOrg();
  const { skus, channels } = await builderData(orgId, ["OFFLINE"]);
  return (
    <>
      <PageHeader title="Offline sale" subtitle="Counter billing for walk-in customers, distributors and B2B. Prints a GST invoice." />
      {channels.length ? (
        <OrderBuilder skus={skus} channels={channels} mode="pos" />
      ) : (
        <div className="card"><Empty action={{ href: "/app/channels", label: "Add an offline channel" }}>You need an active channel of type “Offline” to use the POS.</Empty></div>
      )}
      <p className="mt-4 text-xs text-slate-500">Tip: a USB barcode scanner works in the search box — scan and the item is added. <Link className="link" href="/app/orders?channel=offline">Past offline sales →</Link></p>
    </>
  );
}
