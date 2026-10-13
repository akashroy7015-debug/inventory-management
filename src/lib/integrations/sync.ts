import "server-only";
import { after } from "next/server";
import type { ChannelConnection } from "@prisma/client";
import { db } from "../db";
import { channelAvailability } from "../stock";
import { describeSummary, importExternalOrders, type ImportSummary } from "../import";
import { decryptJson } from "./crypto";
import { connector } from "./index";
import type { ConnectorContext } from "./types";

const LOCK_MS = 10 * 60_000;
const FIRST_SYNC_DAYS = 7;

export type ConnectionSettings = { fbaLocationId?: string | null };

function ctxOf(conn: ChannelConnection): ConnectorContext {
  return { creds: decryptJson<Record<string, string>>(conn.credentials) };
}

async function log(connectionId: string, kind: string, ok: boolean, summary: string, details?: string, startedAt = new Date()) {
  await db.syncLog.create({ data: { connectionId, kind, ok, summary, details: details?.slice(0, 4000), startedAt } });
  const cutoff = await db.syncLog.findFirst({ where: { connectionId }, orderBy: { startedAt: "desc" }, skip: 50, select: { startedAt: true } });
  if (cutoff) await db.syncLog.deleteMany({ where: { connectionId, startedAt: { lte: cutoff.startedAt } } });
}

/** Runs fn while holding the connection's sync lock; returns null if another sync holds it. */
async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T | null> {
  const { count } = await db.channelConnection.updateMany({
    where: { id, OR: [{ syncingSince: null }, { syncingSince: { lt: new Date(Date.now() - LOCK_MS) } }] },
    data: { syncingSince: new Date() },
  });
  if (!count) return null;
  try {
    return await fn();
  } finally {
    await db.channelConnection.update({ where: { id }, data: { syncingSince: null } }).catch(() => {});
  }
}

async function fail(conn: ChannelConnection, kind: string, e: unknown, startedAt: Date) {
  const message = (e as Error).message ?? String(e);
  await db.channelConnection.update({ where: { id: conn.id }, data: { status: "ERROR", lastError: message.slice(0, 500) } });
  await log(conn.id, kind, false, message.slice(0, 300), undefined, startedAt);
}

export async function syncOrders(connectionId: string, opts: { userId?: string | null } = {}): Promise<ImportSummary | null> {
  const conn = await db.channelConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const startedAt = new Date();
  const result = await withLock(conn.id, async () => {
    try {
      const since = conn.lastOrderSyncAt
        ? new Date(conn.lastOrderSyncAt.getTime() - 60 * 60_000) // overlap; duplicates are skipped
        : new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000);
      const orders = await connector(conn.provider).fetchOrders(ctxOf(conn), since);
      const settings = (conn.settings ?? {}) as ConnectionSettings;
      const summary = await importExternalOrders(conn.organizationId, conn.channelId, orders, {
        userId: opts.userId,
        locationFor: (o) => (o.fulfilledByMarketplace ? settings.fbaLocationId || "skip" : null),
      });
      await db.channelConnection.update({
        where: { id: conn.id },
        data: { lastOrderSyncAt: startedAt, status: "CONNECTED", lastError: summary.failed ? summary.messages[0]?.slice(0, 500) : null },
      });
      await log(conn.id, "orders", summary.failed === 0, `${orders.length} orders checked · ${describeSummary(summary)}`, summary.messages.join("\n"), startedAt);
      return summary;
    } catch (e) {
      await fail(conn, "orders", e, startedAt);
      throw e;
    }
  });
  // Imported orders changed stock: tell every connected marketplace.
  if (result && (result.created || result.cancelled)) await pushStockForOrg(conn.organizationId);
  return result;
}

/** Sends available stock (minus buffer) for linked SKUs. Only changed quantities unless `full`. */
export async function pushStock(connectionId: string, opts: { full?: boolean } = {}) {
  const conn = await db.channelConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const startedAt = new Date();
  return withLock(conn.id, async () => {
    try {
      const rows = (await channelAvailability(conn.organizationId, conn.channelId)).filter(
        (r) => r.mapped && (opts.full || r.lastPushedQty !== r.available),
      );
      if (!rows.length) {
        await db.channelConnection.update({ where: { id: conn.id }, data: { lastStockSyncAt: startedAt } });
        if (opts.full) await log(conn.id, "stock", true, "Nothing to update — link SKUs first (Match listings)", undefined, startedAt);
        return { updated: 0, errors: [] as string[] };
      }
      const result = await connector(conn.provider).pushStock(
        ctxOf(conn),
        rows.map((r) => ({ externalSku: r.externalSku, externalId: r.externalId, quantity: r.available })),
      );
      const failedSkus = new Set(result.errors.map((e) => e.split(":")[0].trim().toLowerCase()));
      for (const r of rows) {
        if (failedSkus.has(r.externalSku.toLowerCase())) continue;
        await db.channelListing.updateMany({
          where: { channelId: conn.channelId, skuId: r.skuId },
          data: { lastPushedQty: r.available, lastPushedAt: startedAt },
        });
      }
      const allFailed = result.updated === 0 && result.errors.length > 0;
      await db.channelConnection.update({
        where: { id: conn.id },
        data: { lastStockSyncAt: startedAt, status: allFailed ? "ERROR" : "CONNECTED", lastError: result.errors[0]?.slice(0, 500) ?? null },
      });
      await log(conn.id, "stock", result.errors.length === 0, `Updated ${result.updated} of ${rows.length} listings`, result.errors.join("\n"), startedAt);
      return result;
    } catch (e) {
      await fail(conn, "stock", e, startedAt);
      throw e;
    }
  });
}

/** Links marketplace listings to our SKUs by matching SKU code or barcode. */
export async function matchListings(connectionId: string) {
  const conn = await db.channelConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const startedAt = new Date();
  try {
    const skus = await db.sku.findMany({ where: { organizationId: conn.organizationId }, select: { id: true, code: true, barcode: true } });
    const existing = await db.channelListing.findMany({ where: { channelId: conn.channelId } });
    const hints = [...new Set([...skus.map((s) => s.code), ...existing.map((l) => l.externalSku)])];
    const listings = await connector(conn.provider).listListings(ctxOf(conn), hints);

    const byCode = new Map<string, string>();
    for (const s of skus) {
      byCode.set(s.code.toLowerCase(), s.id);
      if (s.barcode) byCode.set(s.barcode.toLowerCase(), s.id);
    }
    const byExternal = new Map(existing.map((l) => [l.externalSku.toLowerCase(), l]));
    const mappedSkus = new Set(existing.map((l) => l.skuId));
    let linked = 0;
    const unmatched: string[] = [];
    for (const l of listings) {
      const current = byExternal.get(l.externalSku.toLowerCase());
      if (current) {
        if (l.externalId && current.externalId !== l.externalId) {
          await db.channelListing.update({ where: { id: current.id }, data: { externalId: l.externalId } });
        }
        linked++;
        continue;
      }
      const skuId = byCode.get(l.externalSku.toLowerCase());
      if (!skuId || mappedSkus.has(skuId)) {
        unmatched.push(l.externalSku);
        continue;
      }
      await db.channelListing.create({ data: { channelId: conn.channelId, skuId, externalSku: l.externalSku, externalId: l.externalId } });
      mappedSkus.add(skuId);
      linked++;
    }
    const summary = `${listings.length} listings found · ${linked} linked to your SKUs · ${unmatched.length} not matched`;
    await log(conn.id, "listings", true, summary, unmatched.length ? `Not matched (rename the SKU or map it manually): ${unmatched.slice(0, 50).join(", ")}` : undefined, startedAt);
    return { found: listings.length, linked, unmatched };
  } catch (e) {
    await fail(conn, "listings", e, startedAt);
    throw e;
  }
}

/** Pushes stock to every connected channel of a business (changed quantities only). */
export async function pushStockForOrg(orgId: string) {
  const conns = await db.channelConnection.findMany({
    where: { organizationId: orgId, autoPushStock: true, status: { not: "DISCONNECTED" }, channel: { active: true } },
    select: { id: true },
  });
  for (const c of conns) await pushStock(c.id).catch(() => {});
}

/** Call after any stock change: pushes new quantities once the response has been sent. */
export function afterStockChange(orgId: string) {
  try {
    after(() => pushStockForOrg(orgId));
  } catch {
    void pushStockForOrg(orgId).catch(() => {});
  }
}

/** Scheduled job: pull new orders, then push stock, for every connected channel. */
export async function runScheduledSync(budgetMs = 50_000) {
  const started = Date.now();
  const conns = await db.channelConnection.findMany({
    where: { status: { not: "DISCONNECTED" }, channel: { active: true } },
    orderBy: { lastOrderSyncAt: { sort: "asc", nulls: "first" } },
  });
  const results: { id: string; channelId: string; orders?: string; stock?: string; error?: string }[] = [];
  for (const c of conns) {
    if (Date.now() - started > budgetMs) break;
    const r: (typeof results)[number] = { id: c.id, channelId: c.channelId };
    try {
      if (c.autoImportOrders) {
        const s = await syncOrders(c.id);
        r.orders = s ? describeSummary(s) : "busy";
      }
      if (c.autoPushStock) {
        const p = await pushStock(c.id);
        r.stock = p ? `${p.updated} updated, ${p.errors.length} errors` : "busy";
      }
    } catch (e) {
      r.error = (e as Error).message;
    }
    results.push(r);
  }
  return { checked: results.length, total: conns.length, results };
}
