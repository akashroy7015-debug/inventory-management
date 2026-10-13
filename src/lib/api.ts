import { NextResponse, type NextRequest } from "next/server";
import type { ChannelType } from "@prisma/client";
import { db } from "./db";

const CHANNEL_TYPES: ChannelType[] = ["WEBSITE", "AMAZON", "FLIPKART", "OFFLINE", "MEESHO", "OTHER"];

export async function apiOrg(req: NextRequest) {
  const header = req.headers.get("authorization");
  const key = header?.startsWith("Bearer ") ? header.slice(7).trim() : req.headers.get("x-api-key")?.trim();
  if (!key) return null;
  return db.organization.findUnique({ where: { apiKey: key } });
}

export const apiError = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/** Accepts a channel id, or a channel type such as "website" (first active channel of that type). */
export async function resolveChannel(orgId: string, ref: string | null | undefined) {
  const value = (ref ?? "website").trim();
  const byId = await db.channel.findFirst({ where: { organizationId: orgId, id: value } });
  if (byId) return byId;
  const type = value.toUpperCase() as ChannelType;
  if (!CHANNEL_TYPES.includes(type)) return null;
  return db.channel.findFirst({ where: { organizationId: orgId, type, active: true }, orderBy: { createdAt: "asc" } });
}
