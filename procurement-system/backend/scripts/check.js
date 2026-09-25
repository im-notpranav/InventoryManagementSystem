const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const counts = {
    products:    await prisma.product.count(),
    categories:  await prisma.category.count(),
    warehouses:  await prisma.warehouse.count(),
    inventory:   await prisma.inventory.count(),
    users:       await prisma.user.count(),
    vendors:     await prisma.vendor.count(),
    warranties:  await prisma.warranty.count(),
    subscriptions: await prisma.subscription.count(),
  };
  console.log('Database verification:');
  Object.entries(counts).forEach(([k,v]) => console.log('  ', k, ':', v));
}
check().finally(() => prisma.$disconnect());
