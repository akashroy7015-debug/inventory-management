"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { checkPassword, hashPassword, newApiKey, requireRole } from "@/lib/auth";
import { formAction, optStr, str } from "@/lib/action";

export const saveOrg = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const name = str(fd, "name");
  if (!name) throw new Error("Business name is required");
  const prefix = (str(fd, "invoicePrefix") || "INV").toUpperCase().replace(/[^A-Z0-9/-]/g, "").slice(0, 12) || "INV";
  await db.organization.update({
    where: { id: orgId },
    data: {
      name, gstin: optStr(fd, "gstin"), phone: optStr(fd, "phone"), email: optStr(fd, "email"),
      address: optStr(fd, "address"), state: optStr(fd, "state"), invoicePrefix: prefix,
    },
  });
  revalidatePath("/app", "layout");
  return "Business details saved";
});

export const regenerateApiKey = formAction(async () => {
  const { orgId } = await requireRole(["OWNER"]);
  await db.organization.update({ where: { id: orgId }, data: { apiKey: newApiKey() } });
  revalidatePath("/app/developers");
  revalidatePath("/app/settings");
  return "New API key created — update it on your website";
});

const ROLES: Role[] = ["ADMIN", "STAFF"];

export const addMember = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const role = ROLES.includes(str(fd, "role") as Role) ? (str(fd, "role") as Role) : "STAFF";
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email");
  let user = await db.user.findUnique({ where: { email } });
  let tempPassword: string | null = null;
  if (!user) {
    if (!name) throw new Error("Enter their name");
    tempPassword = randomBytes(6).toString("base64url");
    user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(tempPassword) } });
  }
  const exists = await db.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: orgId } } });
  if (exists) throw new Error("They are already a member");
  await db.membership.create({ data: { userId: user.id, organizationId: orgId, role } });
  revalidatePath("/app/settings");
  return tempPassword
    ? `Added ${email}. Share this temporary password with them: ${tempPassword}\nThey can change it under Settings after logging in.`
    : `Added ${email} — they can log in with their existing password.`;
});

export const removeMember = formAction(async (fd) => {
  const { orgId, user } = await requireRole(["OWNER", "ADMIN"]);
  const m = await db.membership.findFirst({ where: { id: str(fd, "id"), organizationId: orgId } });
  if (!m) throw new Error("Member not found");
  if (m.role === "OWNER") throw new Error("The owner can't be removed");
  if (m.userId === user.id) throw new Error("You can't remove yourself");
  await db.membership.delete({ where: { id: m.id } });
  revalidatePath("/app/settings");
  return "Member removed";
});

export const changePassword = formAction(async (fd) => {
  const { user } = await requireRole(["OWNER", "ADMIN", "STAFF"]);
  if (!(await checkPassword(str(fd, "current"), user.passwordHash))) throw new Error("Current password is wrong");
  const next = str(fd, "next");
  if (next.length < 8) throw new Error("New password must be at least 8 characters");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return "Password changed";
});
