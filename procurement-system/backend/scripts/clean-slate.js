const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSlate() {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   InventBot — Clean Slate Script       ║');
  console.log('║   Wiping all procurement data...       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  const steps = [
    { name: 'Billing Documents',       fn: () => prisma.billingDocument.deleteMany() },
    { name: 'Gate Entries',            fn: () => prisma.gateEntry.deleteMany() },
    { name: 'Payments',                fn: () => prisma.payment.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Invoices',                fn: () => prisma.invoice.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Receipt Items',           fn: () => prisma.receiptItem.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Goods Receipts',          fn: () => prisma.goodsReceipt.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Work Orders',             fn: () => prisma.workOrder.deleteMany() },
    { name: 'Vendor Quote Submissions',fn: () => prisma.vendorQuoteSubmission.deleteMany() },
    { name: 'Vendor Quotes',           fn: () => prisma.vendorQuote.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Vendor RFQs',             fn: () => prisma.vendorRFQ.deleteMany() },
    { name: 'Order Items',             fn: () => prisma.orderItem.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Vendor Portal Actions',   fn: () => prisma.vendorPortalAction.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Return Orders',           fn: () => prisma.returnOrder.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Purchase Orders',         fn: () => prisma.purchaseOrder.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Approval Logs',           fn: () => prisma.approvalLog.deleteMany() },
    { name: 'Purchase Requests',       fn: () => prisma.purchaseRequest.deleteMany() },
    { name: 'Notifications',           fn: () => prisma.notification.deleteMany() },
    { name: 'Audit Logs',              fn: () => prisma.auditLog.deleteMany().catch(() => ({ count: 0 })) },
    { name: 'Warranties',              fn: () => prisma.warranty.deleteMany() },
    { name: 'Subscriptions',           fn: () => prisma.subscription.deleteMany() },
    { name: 'Inventory',               fn: () => prisma.inventory.deleteMany() },
  ];

  let totalDeleted = 0;

  for (const step of steps) {
    try {
      const result = await step.fn();
      const count = result?.count || 0;
      if (count > 0) {
        console.log(`  Deleted ${count} ${step.name}`);
        totalDeleted += count;
      } else {
        console.log(`  ${step.name}: nothing to delete`);
      }
    } catch (err) {
      console.log(`  ${step.name}: skipped (${err.message.split('\n')[0]})`);
    }
  }

  console.log('');
  console.log(`Procurement data cleared. Total records deleted: ${totalDeleted}`);
  console.log('');

  console.log('Clearing products, categories and warehouses...');

  try {
    const products = await prisma.product.deleteMany();
    console.log(`  Deleted ${products.count} Products`);
  } catch (e) {
    console.log('  Products: could not delete -', e.message.split('\n')[0]);
  }

  try {
    const cats = await prisma.category.deleteMany();
    console.log(`  Deleted ${cats.count} Categories`);
  } catch (e) {
    console.log('  Categories: could not delete -', e.message.split('\n')[0]);
  }

  try {
    const wh = await prisma.warehouse.deleteMany();
    console.log(`  Deleted ${wh.count} Warehouses`);
  } catch (e) {
    console.log('  Warehouses: could not delete -', e.message.split('\n')[0]);
  }

  console.log('');
  console.log('All procurement data has been cleared.');
  console.log('');
}

cleanSlate()
  .catch((e) => {
    console.error('Clean slate failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
