"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg, requireRole } from "@/lib/auth";
import { formAction, str } from "@/lib/action";
import { importOrderReport } from "@/lib/import";

const TYPES: ChannelType[] = ["WEBSITE", "AMAZON", "FLIPKART", "OFFLINE", "MEESHO", "OTHER"];

async function channelFields(orgId: string, fd: FormData) {
  const name = str(fd, "name");
  if (!name) throw new Error("Name is required");
  const type = str(fd, "type") as ChannelType;
  if (!TYPES.includes(type)) throw new Error("Choose a channel type");
  const bufferQty = Math.max(0, Math.trunc(Number(str(fd, "bufferQty") || 0)));
  const locationId = str(fd, "locationId") || null;
  if (locationId && !(await db.location.findFirst({ where: { id: locationId, organizationId: orgId } }))) throw new Error("Unknown location");
  return { name, type, bufferQty, locationId };
}

export const createChannel = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const ch = await db.channel.create({ data: { ...(await channelFields(orgId, fd)), organizationId: orgId } });
  redirect(`/app/channels/${ch.id}`);
});

export const updateChannel = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const { count } = await db.channel.updateMany({
    where: { id: str(fd, "id"), organizationId: orgId },
    data: { ...(await channelFields(orgId, fd)), active: str(fd, "active") === "on" },
  });
  if (!count) throw new Error("Channel not found");
  revalidatePath("/app/channels");
  return "Channel saved";
});

export const saveMappings = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const channelId = str(fd, "channelId");
  const channel = await db.channel.findFirst({ where: { id: channelId, organizationId: orgId } });
  if (!channel) throw new Error("Channel not found");
  const skus = await db.sku.findMany({ where: { organizationId: orgId }, select: { id: true, code: true } });
  const seen = new Set<string>();
  await db.$transaction(async (tx) => {
    for (const s of skus) {
      const externalSku = str(fd, `ext_${s.id}`);
      const externalId = str(fd, `id_${s.id}`) || null;
      if (!externalSku && !externalId) {
        await tx.channelListing.deleteMany({ where: { channelId, skuId: s.id } });
        continue;
      }
      const ext = externalSku || s.code;
      if (seen.has(ext.toLowerCase())) throw new Error(`Channel SKU "${ext}" is used twice`);
      seen.add(ext.toLowerCase());
      await tx.channelListing.upsert({
        where: { channelId_skuId: { channelId, skuId: s.id } },
        create: { channelId, skuId: s.id, externalSku: ext, externalId },
        update: { externalSku: ext, externalId },
      });
    }
  });
  revalidatePath(`/app/channels/${channelId}`);
  return "Mappings saved";
});

export const importOrders = formAction(async (fd) => {
  const { orgId, user } = await requireOrg();
  const channelId = str(fd, "channelId");
  if (!(await db.channel.findFirst({ where: { id: channelId, organizationId: orgId } }))) throw new Error("Channel not found");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV or TXT report file");
  if (file.size > 10 * 1024 * 1024) throw new Error("File is larger than 10 MB");
  const s = await importOrderReport(orgId, channelId, await file.text(), user.id);
  revalidatePath("/app", "layout");
  const head = `Imported ${s.created} orders · skipped ${s.skipped} (already imported or cancelled) · failed ${s.failed}`;
  if (s.messages.length) {
    if (!s.created) throw new Error([head, ...s.messages.slice(0, 10)].join("\n"));
    return [head, ...s.messages.slice(0, 10)].join("\n");
  }
  return head;
});
