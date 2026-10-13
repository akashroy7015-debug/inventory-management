import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { label, money } from "@/lib/format";
import { ActionForm, Submit } from "@/components/action-form";
import { Badge, Card, PageHeader, channelTone } from "@/components/ui";
import { ChannelFields } from "./channel-fields";
import { createChannel } from "./actions";

export const metadata = { title: "Channels" };

export default async function ChannelsPage() {
  const { orgId } = await requireOrg();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [channels, locations, stats] = await Promise.all([
    db.channel.findMany({ where: { organizationId: orgId }, include: { location: true, _count: { select: { listings: true } } }, orderBy: { createdAt: "asc" } }),
    db.location.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }),
    db.order.groupBy({ by: ["channelId"], where: { organizationId: orgId, orderDate: { gte: since }, status: { notIn: ["CANCELLED", "RETURNED"] } }, _sum: { total: true }, _count: true }),
  ]);
  const byChannel = new Map(stats.map((s) => [s.channelId, s]));
  return (
    <>
      <PageHeader title="Sales channels" subtitle="Where you sell. Each channel draws from one stock pool, minus a safety buffer to prevent overselling." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((c) => {
            const s = byChannel.get(c.id);
            return (
              <Link key={c.id} href={`/app/channels/${c.id}`} className="card card-pad block transition hover:border-brand-500">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{c.name}</h2>
                  <Badge tone={c.active ? channelTone[c.type] : "gray"}>{c.active ? label(c.type) : "Inactive"}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-slate-500">30-day sales</dt><dd className="font-medium">{money(Number(s?._sum.total ?? 0))}</dd></div>
                  <div><dt className="text-xs text-slate-500">Orders</dt><dd className="font-medium">{s?._count ?? 0}</dd></div>
                  <div><dt className="text-xs text-slate-500">Stock from</dt><dd>{c.location?.name ?? "Default"}</dd></div>
                  <div><dt className="text-xs text-slate-500">Buffer · mapped SKUs</dt><dd>{c.bufferQty} · {c._count.listings}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
        <Card title="Add channel">
          <ActionForm action={createChannel} className="space-y-3">
            <ChannelFields locations={locations} />
            <Submit>Add channel</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
