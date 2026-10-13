import { requireOrg } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { org } = await requireOrg();
  return (
    <>
      <PageHeader title="New product" subtitle="Add the product once — then sell it on every channel." />
      <ProductForm defaultBrand={org.name} />
    </>
  );
}
