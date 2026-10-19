import Link from "next/link";
import { ActionForm, Submit } from "@/components/action-form";
import { AuthShell } from "@/components/auth-shell";
import { BusinessFields } from "@/components/business-fields";
import { signup } from "../actions";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Takes about a minute. GST details are optional.">
      <ActionForm action={signup} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input className="input" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Work email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" aria-describedby="password-help" />
          <p id="password-help" className="mt-1 text-[13px] text-subtle">At least 8 characters.</p>
        </div>
        <BusinessFields />
        <Submit className="btn btn-primary w-full">Create account</Submit>
      </ActionForm>
      <p className="text-center text-[15px] text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
