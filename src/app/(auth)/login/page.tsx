import Link from "next/link";
import { ActionForm, Submit } from "@/components/action-form";
import { AuthShell } from "@/components/auth-shell";
import { login } from "../actions";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your inventory.">
      <ActionForm action={login} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Submit className="btn btn-primary w-full">Log in</Submit>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        New here? <Link href="/signup" className="link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
