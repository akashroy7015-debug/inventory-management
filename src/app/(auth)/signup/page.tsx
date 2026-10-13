import Link from "next/link";
import { ActionForm, Submit } from "@/components/action-form";
import { AuthShell } from "@/components/auth-shell";
import { BusinessFields } from "@/components/business-fields";
import { signup } from "../actions";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your free account" subtitle="Set up your business workspace in under a minute.">
      <ActionForm action={signup} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input className="input" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <BusinessFields />
        <Submit className="btn btn-primary w-full">Create account</Submit>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="link">Log in</Link>
      </p>
    </AuthShell>
  );
}
