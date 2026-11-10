const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  const counts = {
    users:                 await prisma.user.count().catch(() => 0),
    roles:                 await prisma.role.count().catch(() => 0),
    vendors:               await prisma.vendor.count().catch(() => 0),
    products:              await prisma.product.count().catch(() => 0),
    categories:            await prisma.category.count().catch(() => 0),
    inventory:             await prisma.inventory.count().catch(() => 0),
    purchaseRequests:      await prisma.purchaseRequest.count().catch(() => 0),
    approvalLogs:          await prisma.approvalLog.count().catch(() => 0),
    vendorRFQs:            await prisma.vendorRFQ.count().catch(() => 0),
    quoteSubmissions:      await prisma.vendorQuoteSubmission.count().catch(() => 0),
    workOrders:            await prisma.workOrder.count().catch(() => 0),
    shipments:             await prisma.shipment.count().catch(() => 0),
    gateChecks:            await prisma.gateCheck.count().catch(() => 0),
    warranties:            await prisma.warranty.count().catch(() => 0),
    subscriptions:         await prisma.subscription.count().catch(() => 0),
    notifications:         await prisma.notification.count().catch(() => 0),
    auditLogs:             await prisma.auditLog.count().catch(() => 0),
  };
  console.log('Current database counts:');
  Object.entries(counts).forEach(([k,v]) => console.log('  ', k, ':', v));
}

audit().finally(() => prisma.$disconnect());
