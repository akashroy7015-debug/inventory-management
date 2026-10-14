"use server";

import { revalidatePath } from "next/cache";
import type { IntegrationProvider, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formAction, str } from "@/lib/action";
import { connector, providersFor } from "@/lib/integrations";
import { decryptJson, encryptJson } from "@/lib/integrations/crypto";
import { matchListings, pushStock, syncOrders } from "@/lib/integrations/sync";
import { describeSummary } from "@/lib/import";

async function ownedChannel(orgId: string, channelId: string) {
  const channel = await db.channel.findFirst({ where: { id: channelId, organizationId: orgId }, include: { connection: true } });
  if (!channel) throw new Error("Channel not found");
  return channel;
}

export const connectChannel = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const channel = await ownedChannel(orgId, str(fd, "channelId"));
  const provider = str(fd, "provider") as IntegrationProvider;
  if (!providersFor(channel.type).includes(provider)) throw new Error("Choose a platform for this channel");
  const c = connector(provider);

  // Blank secret fields keep the saved value, so credentials never have to be re-typed or shown.
  const previous = channel.connection?.provider === provider ? decryptJson<Record<string, string>>(channel.connection.credentials) : {};
  const creds: Record<string, string> = {};
  for (const f of c.fields) {
    let v = str(fd, `f_${f.key}`);
    if (!v && f.type === "password" && previous[f.key]) v = previous[f.key];
    if (!v && f.type === "select") v = f.options?.[0]?.value ?? "";
    if (!v && !f.optional) throw new Error(`${f.label} is required`);
    if (v) creds[f.key] = v;
  }

  const { accountName } = await c.test({ creds });
  let settings: Prisma.InputJsonValue = (channel.connection?.settings as Prisma.InputJsonValue) ?? {};
  if (provider === "AMAZON" && !channel.connection) {
    const fba = await db.location.findFirst({ where: { organizationId: orgId, type: "AMAZON_FBA" } });
    settings = { fbaLocationId: fba?.id ?? null };
  }
  const data = { provider, credentials: encryptJson(creds), status: "CONNECTED" as const, accountName, lastError: null, settings };
  const conn = await db.channelConnection.upsert({
    where: { channelId: channel.id },
    create: { ...data, organizationId: orgId, channelId: channel.id },
    update: provider === channel.connection?.provider ? data : { ...data, lastOrderSyncAt: null, lastStockSyncAt: null },
  });
  await db.syncLog.create({ data: { connectionId: conn.id, kind: "connect", ok: true, summary: `Connected to ${accountName}` } });

  let linked = "";
  try {
    const m = await matchListings(conn.id);
    linked = ` Found ${m.found} listings and linked ${m.linked} to your SKUs.`;
  } catch (e) {
    linked = ` Listing match failed: ${(e as Error).message}`;
  }
  revalidatePath(`/app/channels/${channel.id}`);
  return `Connected to ${accountName}.${linked}`;
});

export const disconnectChannel = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const channel = await ownedChannel(orgId, str(fd, "channelId"));
  await db.channelConnection.deleteMany({ where: { channelId: channel.id } });
  revalidatePath(`/app/channels/${channel.id}`);
  return "Disconnected — saved credentials were deleted";
});

export const saveConnectionSettings = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const channel = await ownedChannel(orgId, str(fd, "channelId"));
  if (!channel.connection) throw new Error("Not connected");
  const fbaLocationId = str(fd, "fbaLocationId") || null;
  if (fbaLocationId && !(await db.location.findFirst({ where: { id: fbaLocationId, organizationId: orgId } }))) throw new Error("Unknown location");
  await db.channelConnection.update({
    where: { id: channel.connection.id },
    data: {
      autoImportOrders: str(fd, "autoImportOrders") === "on",
      autoPushStock: str(fd, "autoPushStock") === "on",
      settings: { ...((channel.connection.settings as object) ?? {}), fbaLocationId },
    },
  });
  revalidatePath(`/app/channels/${channel.id}`);
  return "Sync settings saved";
});

export const runSyncNow = formAction(async (fd) => {
  const { orgId, user } = await requireRole(["OWNER", "ADMIN", "STAFF"]);
  const channel = await ownedChannel(orgId, str(fd, "channelId"));
  if (!channel.connection) throw new Error("Not connected");
  const id = channel.connection.id;
  const kind = str(fd, "kind");
  const busy = "A sync is already running for this channel — try again in a minute.";
  let msg: string;
  try {
    if (kind === "orders") {
      const s = await syncOrders(id, { userId: user.id });
      msg = s ? `Orders synced: ${describeSummary(s)}${s.messages.length ? `\n${s.messages.slice(0, 5).join("\n")}` : ""}` : busy;
    } else if (kind === "stock") {
      const r = await pushStock(id, { full: true });
      msg = r ? `Stock sent: ${r.updated} listings updated${r.errors.length ? `\n${r.errors.slice(0, 5).join("\n")}` : ""}` : busy;
    } else {
      const m = await matchListings(id);
      msg = `${m.found} listings found · ${m.linked} linked to your SKUs${m.unmatched.length ? `\nNot matched: ${m.unmatched.slice(0, 10).join(", ")}` : ""}`;
    }
  } finally {
    revalidatePath(`/app/channels/${channel.id}`);
    revalidatePath("/app", "layout");
  }
  return msg;
});
