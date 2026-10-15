import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Reports whether the app can reach its database, without exposing connection details. */
export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };
  try {
    await db.organization.count();
    return NextResponse.json({ ok: true, database: "ok", env });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    const database = !env.DATABASE_URL
      ? "DATABASE_URL is not set"
      : /does not exist/i.test(msg)
        ? "connected, but tables are missing — migrations have not run"
        : /authentication failed|password/i.test(msg)
          ? "wrong database username or password"
          : /can't reach|ENOTFOUND|timed out|ECONNREFUSED/i.test(msg)
            ? "database server unreachable — check the host in DATABASE_URL"
            : "database error";
    return NextResponse.json({ ok: false, database, env }, { status: 503 });
  }
}
