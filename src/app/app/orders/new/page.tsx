import { requireOrg } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { OrderBuilder } from "../order-builder";
import { builderData } from "../builder-data";

export const metadata = { title: "New order" };

export default async function NewOrderPage() {
  const { orgId } = await requireOrg();
  const { skus, channels } = await builderData(orgId);
  return (
    <>
      <PageHeader title="New order" subtitle="Record an order from any channel. Stock is deducted immediately." />
      <OrderBuilder skus={skus} channels={channels} mode="order" />
    </>
  );
}
