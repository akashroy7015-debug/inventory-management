import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { AuthShell } from "@/components/auth-shell";
import { BusinessFields } from "@/components/business-fields";
import { getSession } from "@/lib/auth";
import { createBusiness } from "../(auth)/actions";

export const metadata = { title: "New business" };

export default async function OnboardingPage() {
  if (!(await getSession())) redirect("/login");
  return (
    <AuthShell title="Add a business" subtitle="Each business has its own products, stock, channels and team.">
      <ActionForm action={createBusiness} className="space-y-4">
        <BusinessFields />
        <Submit className="btn btn-primary w-full">Create business</Submit>
      </ActionForm>
    </AuthShell>
  );
}
