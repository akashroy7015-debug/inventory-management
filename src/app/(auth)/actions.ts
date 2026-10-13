"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, endSession, getSession, hashPassword, startSession } from "@/lib/auth";
import { createOrganization } from "@/lib/org";
import { formAction, optStr, str } from "@/lib/action";

const signupSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  company: z.string().min(2, "Enter your business name"),
});

export const signup = formAction(async (fd) => {
  const data = signupSchema.parse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    company: str(fd, "company"),
  });
  if (await db.user.findUnique({ where: { email: data.email } })) throw new Error("An account with this email already exists. Log in instead.");
  const user = await db.user.create({
    data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) },
  });
  const org = await createOrganization(user.id, { name: data.company, gstin: optStr(fd, "gstin"), state: optStr(fd, "state") });
  await startSession(user.id, org.id);
  redirect("/app?welcome=1");
});

export const login = formAction(async (fd) => {
  const email = str(fd, "email").toLowerCase();
  const user = await db.user.findUnique({ where: { email }, include: { memberships: { orderBy: { createdAt: "asc" } } } });
  if (!user || !(await checkPassword(str(fd, "password"), user.passwordHash))) throw new Error("Wrong email or password");
  await startSession(user.id, user.memberships[0]?.organizationId ?? null);
  const next = str(fd, "next");
  redirect(next.startsWith("/app") ? next : "/app");
});

export const createBusiness = formAction(async (fd) => {
  const session = await getSession();
  if (!session) redirect("/login");
  const name = str(fd, "company");
  if (name.length < 2) throw new Error("Enter your business name");
  const org = await createOrganization(session.uid, { name, gstin: optStr(fd, "gstin"), state: optStr(fd, "state") });
  await startSession(session.uid, org.id);
  redirect("/app?welcome=1");
});

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function switchOrg(fd: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = str(fd, "orgId");
  const m = await db.membership.findUnique({ where: { userId_organizationId: { userId: session.uid, organizationId: orgId } } });
  if (m) await startSession(session.uid, orgId);
  redirect("/app");
}
