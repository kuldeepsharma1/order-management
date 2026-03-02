// src/seed.ts
import { prisma } from "./lib/prisma";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create a Dummy Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Corp",
      currency: "USD",
    },
  });
  console.log(`✅ Created Tenant: ${tenant.name} (ID: ${tenant.id})`);

  // 2. Create Roles
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "ADMIN",
    },
  });
  const staffRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "STAFF",
    },
  });
  console.log(`✅ Created Roles: ADMIN, STAFF`);

  // 3. Create an Admin User
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@acmecorp.com",
      roleId: adminRole.id,
    },
  });
  console.log(`✅ Created User: ${adminUser.email}`);

  // 4. Create a Customer
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
    },
  });
  console.log(`✅ Created Customer: ${customer.name}`);

  // 5. Create Products (with Prices and Inventory Ledger entries)
  const product1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Wireless Noise-Cancelling Headphones",
      sku: "WH-100",
      skuNormalized: "WH-100",
      stock: 50,
      prices: {
        create: {
          tenantId: tenant.id,
          price: 19999, // $199.99 in cents
          currency: "USD",
          active: true,
        },
      },
      inventory: {
        create: {
          tenantId: tenant.id,
          quantity: 50,
          type: "PURCHASE",
          reference: "INITIAL_STOCK",
        },
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Mechanical Keyboard",
      sku: "MK-200",
      skuNormalized: "MK-200",
      stock: 30,
      prices: {
        create: {
          tenantId: tenant.id,
          price: 12999, // $129.99 in cents
          currency: "USD",
          active: true,
        },
      },
      inventory: {
        create: {
          tenantId: tenant.id,
          quantity: 30,
          type: "PURCHASE",
          reference: "INITIAL_STOCK",
        },
      },
    },
  });

  console.log(`✅ Created Products: ${product1.sku}, ${product2.sku}`);
  console.log("🎉 Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });