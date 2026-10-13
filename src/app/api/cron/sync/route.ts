import { NextResponse, type NextRequest } from "next/server";
import { runScheduledSync } from "@/lib/integrations/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pulls new marketplace orders and pushes stock for every connected channel.
 * Call every 10–15 minutes with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends this header automatically).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runScheduledSync());
}

export const POST = GET;
