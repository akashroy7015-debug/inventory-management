import { db } from "./db";
import { newApiKey } from "./auth";

/** Creates a business workspace with sensible defaults so it is usable immediately. */
export async function createOrganization(userId: string, data: { name: string; gstin?: string | null; state?: string | null }) {
  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: data.name, gstin: data.gstin ?? null, state: data.state ?? null, apiKey: newApiKey() },
    });
    await tx.membership.create({ data: { userId, organizationId: org.id, role: "OWNER" } });
    const warehouse = await tx.location.create({
      data: { organizationId: org.id, name: "Main Warehouse", type: "WAREHOUSE", isDefault: true },
    });
    await tx.channel.createMany({
      data: [
        { organizationId: org.id, name: "Website", type: "WEBSITE", locationId: warehouse.id },
        { organizationId: org.id, name: "Amazon", type: "AMAZON", locationId: warehouse.id, bufferQty: 2 },
        { organizationId: org.id, name: "Flipkart", type: "FLIPKART", locationId: warehouse.id, bufferQty: 2 },
        { organizationId: org.id, name: "Offline Store", type: "OFFLINE", locationId: warehouse.id },
      ],
    });
    return org;
  });
}
