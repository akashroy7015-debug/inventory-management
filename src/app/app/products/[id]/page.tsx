import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { Submit } from "@/components/action-form";
import { ProductForm } from "../product-form";
import { deleteProduct } from "../actions";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { orgId } = await requireOrg();
  const { id } = await params;
  const { saved } = await searchParams;
  const p = await db.product.findFirst({ where: { id, organizationId: orgId }, include: { skus: { orderBy: { createdAt: "asc" } } } });
  if (!p) notFound();
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={<Link href="/app/products" className="link">← All products</Link>}
        actions={
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={p.id} />
            <Submit className="btn btn-danger" confirm="Delete this product? Products with sales history are archived instead.">Delete</Submit>
          </form>
        }
      />
      {saved && <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Product saved.</p>}
      <ProductForm
        initial={{
          id: p.id, name: p.name, brand: s(p.brand), category: s(p.category), description: s(p.description), hsnCode: s(p.hsnCode),
          gstRate: s(Number(p.gstRate)), active: p.active,
          variants: p.skus.map((k) => ({
            id: k.id, code: k.code, variantName: s(k.variantName), barcode: s(k.barcode), mrp: s(Number(k.mrp)), price: s(Number(k.price)),
            costPrice: s(Number(k.costPrice)), weightGrams: s(k.weightGrams), lowStockThreshold: s(k.lowStockThreshold), active: k.active,
          })),
        }}
      />
    </>
  );
}
