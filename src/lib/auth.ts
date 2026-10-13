import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession, sessionCookieOptions } from "./session";
import type { Role } from "@prisma/client";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function newApiKey() {
  return "sk_" + randomBytes(24).toString("hex");
}

export async function startSession(uid: string, oid: string | null) {
  const token = await signSession({ uid, oid });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Current user + active organization. Redirects to login / onboarding when missing. */
export async function requireOrg() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { memberships: { include: { organization: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!user) redirect("/login");
  const membership =
    user.memberships.find((m) => m.organizationId === session.oid) ?? user.memberships[0];
  if (!membership) redirect("/onboarding");
  return {
    user,
    org: membership.organization,
    role: membership.role,
    orgId: membership.organizationId,
    memberships: user.memberships,
  };
}

export async function requireRole(roles: Role[]) {
  const ctx = await requireOrg();
  if (!roles.includes(ctx.role)) throw new Error("You do not have permission to do this.");
  return ctx;
}
