import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { OrderBuilder } from "../orders/order-builder";
import { builderData } from "../orders/builder-data";

export const metadata = { title: "Offline POS" };

export default async function PosPage() {
  const { orgId } = await requireOrg();
  const { skus, channels, location } = await builderData(orgId, ["OFFLINE"]);
  const emptyShelf = location && skus.length > 0 && skus.every((s) => s.stock <= 0);
  return (
    <>
      <PageHeader title="Offline sale" subtitle="Counter billing for walk-in customers, distributors and B2B. Prints a GST invoice." />
      {channels.length > 0 && emptyShelf && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <PackageOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1"><strong className="font-semibold">{location.name} has no stock yet.</strong> The POS sells from this location — move stock here from your warehouse first.</p>
          <Link href={`/app/inventory?tab=transfer&to=${location.id}`} className="btn btn-sm border-amber-300 bg-white">Transfer stock <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      )}
      {channels.length ? (
        <OrderBuilder skus={skus} channels={channels} mode="pos" />
      ) : (
        <div className="card"><Empty action={{ href: "/app/channels", label: "Add an offline channel" }}>You need an active channel of type “Offline” to use the POS.</Empty></div>
      )}
      <p className="mt-4 text-xs text-slate-500">Tip: a USB barcode scanner works in the search box — scan and the item is added. <Link className="link" href="/app/orders?channel=offline">Past offline sales →</Link></p>
    </>
  );
}
