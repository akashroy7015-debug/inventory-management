// Demo data: `npm run db:seed` creates demo@moriveda.in / demo1234 with the Moriveda catalogue.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

async function main() {
  const email = "demo@moriveda.in";
  if (await db.user.findUnique({ where: { email } })) {
    console.log("Demo user already exists — nothing to do.");
    return;
  }
  const user = await db.user.create({ data: { name: "Moriveda Admin", email, passwordHash: await bcrypt.hash("demo1234", 10) } });
  const org = await db.organization.create({
    data: { name: "Moriveda", state: "Rajasthan", invoicePrefix: "MV", apiKey: "sk_" + randomBytes(24).toString("hex") },
  });
  await db.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });
  const wh = await db.location.create({ data: { organizationId: org.id, name: "Main Warehouse", type: "WAREHOUSE", isDefault: true } });
  const shop = await db.location.create({ data: { organizationId: org.id, name: "Retail Counter", type: "STORE" } });
  await db.channel.createMany({
    data: [
      { organizationId: org.id, name: "Website", type: "WEBSITE", locationId: wh.id },
      { organizationId: org.id, name: "Amazon", type: "AMAZON", locationId: wh.id, bufferQty: 2 },
      { organizationId: org.id, name: "Flipkart", type: "FLIPKART", locationId: wh.id, bufferQty: 2 },
      { organizationId: org.id, name: "Offline Store", type: "OFFLINE", locationId: shop.id },
    ],
  });

  const catalogue = [
    { name: "Organic Moringa Leaf Powder", hsn: "1211", gst: 5, variants: [
      { code: "MOR-100", v: "100 g", mrp: 249, price: 199, cost: 70, qty: 180 },
      { code: "MOR-250", v: "250 g", mrp: 449, price: 349, cost: 150, qty: 240 },
      { code: "MOR-500", v: "500 g", mrp: 799, price: 649, cost: 280, qty: 90 },
    ] },
    { name: "Moringa Capsules", hsn: "2106", gst: 18, variants: [{ code: "MOR-CAP-60", v: "60 capsules", mrp: 499, price: 399, cost: 140, qty: 8 }] },
    { name: "Moringa Green Tea", hsn: "0902", gst: 5, variants: [{ code: "MOR-TEA-25", v: "25 bags", mrp: 299, price: 249, cost: 90, qty: 60 }] },
  ];
  const now = new Date();
  for (const p of catalogue) {
    const product = await db.product.create({
      data: { organizationId: org.id, name: p.name, brand: "Moriveda", category: "Moringa", hsnCode: p.hsn, gstRate: p.gst },
    });
    for (const [i, v] of p.variants.entries()) {
      const sku = await db.sku.create({
        data: { organizationId: org.id, productId: product.id, code: v.code, variantName: v.v, mrp: v.mrp, price: v.price, costPrice: v.cost, lowStockThreshold: 20 },
      });
      const batch = await db.batch.create({
        data: {
          organizationId: org.id, skuId: sku.id, batchNo: `MV24${String(i + 1).padStart(2, "0")}`,
          mfgDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
          expiryDate: new Date(now.getFullYear(), now.getMonth() + (i === 0 ? 2 : 12), 1),
        },
      });
      await db.stockLevel.create({ data: { organizationId: org.id, skuId: sku.id, locationId: wh.id, batchId: batch.id, batchKey: batch.id, quantity: v.qty } });
      await db.stockMovement.create({ data: { organizationId: org.id, skuId: sku.id, locationId: wh.id, batchId: batch.id, quantity: v.qty, type: "ADJUSTMENT", reference: "Opening stock", userId: user.id } });
    }
  }
  console.log(`Seeded demo account: ${email} / demo1234`);
}

main().finally(() => db.$disconnect());
