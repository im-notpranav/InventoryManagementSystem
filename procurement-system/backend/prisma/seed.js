import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');
  const generatePassword = () => crypto.randomBytes(10).toString('base64url');
  const adminSeedPassword = process.env.SEED_ADMIN_PASSWORD || generatePassword();
  const userSeedPassword = process.env.SEED_USER_PASSWORD || generatePassword();
  const vendorSeedPassword = process.env.SEED_VENDOR_PASSWORD || generatePassword();

  // Roles
  const roles = await Promise.all(
    ['Admin', 'Manager', 'User', 'Vendor'].map(name =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  console.log('✅ Roles created');

  const adminRole = roles.find(r => r.name === 'Admin');
  const userRole = roles.find(r => r.name === 'User');
  const vendorRole = roles.find(r => r.name === 'Vendor');

  // Admin user
  const hashedPassword = await bcrypt.hash(adminSeedPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventbot.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@inventbot.com',
      password: hashedPassword,
      department: 'IT',
      roleId: adminRole.id,
    },
  });

  // Regular user
  const userPassword = await bcrypt.hash(userSeedPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@inventbot.com' },
    update: {},
    create: {
      name: 'Ravi Kumar',
      email: 'user@inventbot.com',
      password: userPassword,
      department: 'Operations',
      roleId: userRole.id,
    },
  });
  console.log('✅ Users created');

  // Categories
  const categories = await Promise.all(
    ['Electronics', 'Furniture', 'Office Supplies', 'Networking', 'Peripherals'].map(name =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  console.log('✅ Categories created');

  // Vendors - 3 vendors for testing with explicit status
  const vendorsData = [
    { name: 'TechSupply Co.', email: 'vendor1@test.com', phone: '+91-9876543210', address: 'Mumbai, India', gstNumber: 'GST27AABCT1234A', rating: 4.5, status: 'Active', isBlacklisted: false },
    { name: 'OfficeWorld', email: 'vendor2@test.com', phone: '+91-9876543211', address: 'Delhi, India', gstNumber: 'GST07AABCO5678B', rating: 4.2, status: 'Active', isBlacklisted: false },
    { name: 'NetGear Distributors', email: 'vendor3@test.com', phone: '+91-9876543212', address: 'Bangalore, India', gstNumber: 'GST29AABCN9012C', rating: 4.8, status: 'Active', isBlacklisted: false },
  ];

  const vendors = [];
  for (const v of vendorsData) {
    const vendor = await prisma.vendor.upsert({
      where: { email: v.email },
      update: { status: 'Active', isBlacklisted: false },
      create: v,
    });
    vendors.push(vendor);
  }
  console.log('✅ Vendors created (3 vendors)');

  // Create 3 vendor user accounts linked to the 3 vendors
  // Using same email as vendor for simplicity - vendor logs in with their vendor email
  const vendorPassword = await bcrypt.hash(vendorSeedPassword, 12);
  
  const vendorUsers = [];
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const vendorUser = await prisma.user.upsert({
      where: { email: vendor.email },
      update: { 
        vendorId: vendor.id, 
        roleId: vendorRole.id,
        isActive: true 
      },
      create: {
        name: vendor.name,
        email: vendor.email,
        password: vendorPassword,
        department: 'Vendor',
        roleId: vendorRole.id,
        vendorId: vendor.id,
        isActive: true,
      },
    });
    vendorUsers.push(vendorUser);
  }
  console.log('✅ Vendor users created (3 accounts - same email as vendor)');

  // Products
  const productsData = [
    { name: 'Laptop - Dell Latitude 5540', sku: 'ELEC-LAP-001', price: 72000, unit: 'pcs', categoryId: categories[0].id },
    { name: 'Desktop Monitor 24"', sku: 'ELEC-MON-001', price: 15000, unit: 'pcs', categoryId: categories[0].id },
    { name: 'Wireless Mouse', sku: 'PERI-MOU-001', price: 800, unit: 'pcs', categoryId: categories[4].id },
    { name: 'Mechanical Keyboard', sku: 'PERI-KEY-001', price: 3500, unit: 'pcs', categoryId: categories[4].id },
    { name: 'Office Chair - Ergonomic', sku: 'FURN-CHR-001', price: 12000, unit: 'pcs', categoryId: categories[1].id },
    { name: 'Standing Desk', sku: 'FURN-DSK-001', price: 25000, unit: 'pcs', categoryId: categories[1].id },
    { name: 'A4 Paper (Box of 5 reams)', sku: 'OFFC-PAP-001', price: 1200, unit: 'box', categoryId: categories[2].id },
    { name: 'Printer Ink Cartridge', sku: 'OFFC-INK-001', price: 2500, unit: 'pcs', categoryId: categories[2].id },
    { name: 'Network Switch 24-Port', sku: 'NETW-SWT-001', price: 18000, unit: 'pcs', categoryId: categories[3].id },
    { name: 'CAT6 Ethernet Cable (100m)', sku: 'NETW-CAB-001', price: 3000, unit: 'roll', categoryId: categories[3].id },
    { name: 'USB-C Hub', sku: 'PERI-HUB-001', price: 2200, unit: 'pcs', categoryId: categories[4].id },
    { name: 'Webcam HD 1080p', sku: 'PERI-CAM-001', price: 4500, unit: 'pcs', categoryId: categories[4].id },
    { name: 'UPS 1000VA', sku: 'ELEC-UPS-001', price: 8500, unit: 'pcs', categoryId: categories[0].id },
    { name: 'Laser Printer', sku: 'ELEC-PRT-001', price: 22000, unit: 'pcs', categoryId: categories[0].id },
    { name: 'Whiteboard 4x3ft', sku: 'OFFC-WBD-001', price: 3500, unit: 'pcs', categoryId: categories[2].id },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    products.push(product);
  }
  console.log('✅ Products created');

  // Inventory
  const inventoryData = [
    { productId: products[0].id, quantity: 15, reorderPoint: 5, minimumStock: 3, location: 'Warehouse A' },
    { productId: products[1].id, quantity: 22, reorderPoint: 8, minimumStock: 5, location: 'Warehouse A' },
    { productId: products[2].id, quantity: 50, reorderPoint: 15, minimumStock: 10, location: 'Store Room 1' },
    { productId: products[3].id, quantity: 8, reorderPoint: 10, minimumStock: 5, location: 'Store Room 1' },
    { productId: products[4].id, quantity: 3, reorderPoint: 5, minimumStock: 2, location: 'Warehouse B' },
    { productId: products[5].id, quantity: 6, reorderPoint: 3, minimumStock: 2, location: 'Warehouse B' },
    { productId: products[6].id, quantity: 120, reorderPoint: 30, minimumStock: 20, location: 'Store Room 2' },
    { productId: products[7].id, quantity: 4, reorderPoint: 10, minimumStock: 5, location: 'Store Room 2' },
    { productId: products[8].id, quantity: 7, reorderPoint: 3, minimumStock: 2, location: 'IT Room' },
    { productId: products[9].id, quantity: 12, reorderPoint: 5, minimumStock: 3, location: 'IT Room' },
    { productId: products[10].id, quantity: 18, reorderPoint: 8, minimumStock: 5, location: 'Store Room 1' },
    { productId: products[11].id, quantity: 10, reorderPoint: 5, minimumStock: 3, location: 'Store Room 1' },
    { productId: products[12].id, quantity: 2, reorderPoint: 4, minimumStock: 2, location: 'Server Room' },
    { productId: products[13].id, quantity: 5, reorderPoint: 2, minimumStock: 1, location: 'IT Room' },
    { productId: products[14].id, quantity: 9, reorderPoint: 3, minimumStock: 2, location: 'Warehouse B' },
  ];

  for (const inv of inventoryData) {
    await prisma.inventory.upsert({
      where: { productId: inv.productId },
      update: inv,
      create: inv,
    });
  }
  console.log('✅ Inventory created');

  // Purchase Requests - one approved for each vendor
  const pr1 = await prisma.purchaseRequest.create({
    data: {
      userId: user.id,
      status: 'PO_Created',
      priority: 'High',
      notes: 'Urgent requirement for new team members',
      approvedAt: new Date(),
      items: {
        create: [
          { productId: products[0].id, quantity: 5 },
          { productId: products[1].id, quantity: 5 },
        ],
      },
    },
  });

  const pr2 = await prisma.purchaseRequest.create({
    data: {
      userId: user.id,
      status: 'PO_Created',
      priority: 'Medium',
      notes: 'Office furniture restocking',
      approvedAt: new Date(),
      items: {
        create: [
          { productId: products[4].id, quantity: 10 },
          { productId: products[5].id, quantity: 5 },
        ],
      },
    },
  });

  const pr3 = await prisma.purchaseRequest.create({
    data: {
      userId: admin.id,
      status: 'PO_Created',
      priority: 'Urgent',
      notes: 'Network equipment for server room',
      approvedAt: new Date(),
      items: {
        create: [
          { productId: products[8].id, quantity: 4 },
          { productId: products[9].id, quantity: 10 },
        ],
      },
    },
  });

  const pr4 = await prisma.purchaseRequest.create({
    data: {
      userId: user.id,
      status: 'RFQ_Sent',
      priority: 'Medium',
      notes: 'Printer ink critically low',
      items: {
        create: [
          { productId: products[7].id, quantity: 15 },
        ],
      },
    },
  });

  const pr5 = await prisma.purchaseRequest.create({
    data: {
      userId: user.id,
      status: 'Pending',
      priority: 'Low',
      notes: 'General office supplies',
      items: {
        create: [
          { productId: products[6].id, quantity: 50 },
        ],
      },
    },
  });

  // Additional Approved PRs for RFQ workflow testing
  const pr6 = await prisma.purchaseRequest.create({
    data: {
      userId: user.id,
      status: 'Approved',
      priority: 'High',
      notes: 'New workstations for design team',
      approvedAt: new Date(),
      items: {
        create: [
          { productId: products[0].id, quantity: 3 },  // Laptops
          { productId: products[10].id, quantity: 3 }, // USB-C Hubs
          { productId: products[11].id, quantity: 3 }, // Webcams
        ],
      },
    },
  });

  const pr7 = await prisma.purchaseRequest.create({
    data: {
      userId: admin.id,
      status: 'RFQ_Sent',
      priority: 'Urgent',
      notes: 'Office expansion - furniture needed',
      items: {
        create: [
          { productId: products[4].id, quantity: 15 },  // Ergonomic Chairs
          { productId: products[5].id, quantity: 8 },   // Standing Desks
          { productId: products[14].id, quantity: 4 },  // Whiteboards
        ],
      },
    },
  });

  console.log('✅ Purchase requests created');

  // Create RFQs for vendors to submit quotations
  const rfq1 = await prisma.rFQ.create({
    data: {
      requestId: pr4.id,
      status: 'Open',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Please provide best price for bulk order',
    },
  });

  const rfq2 = await prisma.rFQ.create({
    data: {
      requestId: pr7.id,
      status: 'Open',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: 'Office expansion project - competitive pricing required',
    },
  });

  // Create RFQ for pr6 (workstations) so vendors can quote
  const rfq3 = await prisma.rFQ.create({
    data: {
      requestId: pr6.id,
      status: 'Open',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      notes: 'Design team workstation setup - quality is priority',
    },
  });

  // Update pr6 status to RFQ_Sent
  await prisma.purchaseRequest.update({
    where: { id: pr6.id },
    data: { status: 'RFQ_Sent' },
  });

  // Invite vendors to RFQs (multi-vendor model)
  // RFQ1: Invite all 3 vendors
  await prisma.rFQVendor.createMany({
    data: [
      { rfqId: rfq1.id, vendorId: vendors[0].id, status: 'Invited' },
      { rfqId: rfq1.id, vendorId: vendors[1].id, status: 'Invited' },
      { rfqId: rfq1.id, vendorId: vendors[2].id, status: 'Invited' },
    ],
  });

  // RFQ2: Invite vendors 1 and 2
  await prisma.rFQVendor.createMany({
    data: [
      { rfqId: rfq2.id, vendorId: vendors[0].id, status: 'Invited' },
      { rfqId: rfq2.id, vendorId: vendors[1].id, status: 'Invited' },
    ],
  });

  // RFQ3: Invite vendors 2 and 3
  await prisma.rFQVendor.createMany({
    data: [
      { rfqId: rfq3.id, vendorId: vendors[1].id, status: 'Invited' },
      { rfqId: rfq3.id, vendorId: vendors[2].id, status: 'Invited' },
    ],
  });

  console.log('✅ RFQs created (3 open RFQs with vendor invitations)');
  console.log('   RFQ1: Invited vendors 1, 2, 3');
  console.log('   RFQ2: Invited vendors 1, 2');
  console.log('   RFQ3: Invited vendors 2, 3');

  // Purchase Orders - one for each vendor so they can see different data
  const po1 = await prisma.purchaseOrder.create({
    data: {
      requestId: pr1.id,
      vendorId: vendors[0].id,  // TechSupply Co. - vendor1@test.com
      status: 'Sent',
      totalAmount: 435000,
      sentToVendor: true,
      sentAt: new Date(),
      paymentTerms: 'Net 30',
      shippingTerms: 'FOB',
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: products[0].id, quantityOrdered: 5, priceEach: 72000 },
          { productId: products[1].id, quantityOrdered: 5, priceEach: 15000 },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      requestId: pr2.id,
      vendorId: vendors[1].id,  // OfficeWorld - vendor2@test.com
      status: 'Sent',
      totalAmount: 245000,
      sentToVendor: true,
      sentAt: new Date(),
      paymentTerms: 'Net 45',
      shippingTerms: 'CIF',
      expectedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: products[4].id, quantityOrdered: 10, priceEach: 12000 },
          { productId: products[5].id, quantityOrdered: 5, priceEach: 25000 },
        ],
      },
    },
  });

  const po3 = await prisma.purchaseOrder.create({
    data: {
      requestId: pr3.id,
      vendorId: vendors[2].id,  // NetGear Distributors - vendor3@test.com
      status: 'Acknowledged',
      totalAmount: 102000,
      sentToVendor: true,
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      paymentTerms: 'Net 30',
      shippingTerms: 'FOB',
      expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: products[8].id, quantityOrdered: 4, priceEach: 18000 },
          { productId: products[9].id, quantityOrdered: 10, priceEach: 3000 },
        ],
      },
    },
  });

  // Add a second PO for vendor 1 (TechSupply) with different status
  const po4 = await prisma.purchaseOrder.create({
    data: {
      requestId: pr1.id,
      vendorId: vendors[0].id,
      status: 'Draft',
      totalAmount: 22000,
      sentToVendor: false,
      paymentTerms: 'Net 30',
      items: {
        create: [
          { productId: products[13].id, quantityOrdered: 1, priceEach: 22000 },
        ],
      },
    },
  });

  // Log vendor portal actions for po3
  await prisma.vendorPortalAction.create({
    data: {
      orderId: po3.id,
      vendorId: vendors[2].id,
      action: 'confirmed',
      message: 'Order confirmed. Will ship within 5 business days.',
    },
  });

  console.log('✅ Purchase orders created (4 POs for 3 vendors)');

  // Warranties
  const warrantyData = [
    { productId: products[0].id, serialNo: 'DL-5540-001', provider: 'Dell India', startDate: new Date('2024-01-15'), endDate: new Date('2027-01-15'), terms: '3-year on-site warranty' },
    { productId: products[8].id, serialNo: 'NG-SW24-001', provider: 'NetGear Support', startDate: new Date('2024-06-01'), endDate: new Date('2025-06-01'), terms: '1-year replacement warranty' },
    { productId: products[13].id, serialNo: 'HP-LJ-001', provider: 'HP India', startDate: new Date('2024-03-10'), endDate: new Date('2025-03-10'), terms: '1-year parts warranty' },
    { productId: products[12].id, serialNo: 'APC-UPS-001', provider: 'APC by Schneider', startDate: new Date('2023-11-01'), endDate: new Date('2025-11-01'), terms: '2-year battery warranty' },
  ];

  for (const w of warrantyData) {
    await prisma.warranty.create({ data: w });
  }
  console.log('✅ Warranties created');

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: 'New Purchase Request', message: 'Ravi Kumar submitted a purchase request for office chairs.', type: 'info', link: '/purchase-requests' },
      { userId: admin.id, title: 'Low Stock Alert', message: 'Printer Ink Cartridge is below reorder point (4/10).', type: 'warning', link: '/inventory' },
      { userId: admin.id, title: 'Warranty Expiring', message: 'HP Laser Printer warranty expires in 30 days.', type: 'warning', link: '/warranties' },
      { userId: user.id, title: 'Request Approved', message: 'Your purchase request for laptops has been approved!', type: 'success', link: '/purchase-requests' },
      // Notifications for vendor users
      { userId: vendorUsers[0].id, title: 'New Purchase Order', message: 'You have received a new purchase order PO-001.', type: 'info', link: '/vendor-portal' },
      { userId: vendorUsers[0].id, title: 'Another PO Pending', message: 'A draft purchase order is awaiting finalization.', type: 'info', link: '/vendor-portal' },
      { userId: vendorUsers[1].id, title: 'New Purchase Order', message: 'You have received a new purchase order for furniture.', type: 'info', link: '/vendor-portal' },
      { userId: vendorUsers[2].id, title: 'PO Acknowledged', message: 'Your confirmation for networking equipment has been recorded.', type: 'success', link: '/vendor-portal' },
    ],
  });
  console.log('✅ Notifications created');

  // Final summary
  const rfqCount = await prisma.rFQ.count({ where: { status: 'Open' } });
  const vendorUserCount = await prisma.user.count({ where: { role: { name: 'Vendor' } } });

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - ${rfqCount} Open RFQs ready for vendor quotations`);
  console.log(`   - ${vendorUserCount} Vendor user accounts created`);
  console.log('\n📧 Login credentials:');
  console.log(`   Admin:   admin@inventbot.com / ${adminSeedPassword}`);
  console.log(`   User:    user@inventbot.com / ${userSeedPassword}`);
  console.log(`   Vendor1: vendor1@test.com / ${vendorSeedPassword} (TechSupply Co.)`);
  console.log(`   Vendor2: vendor2@test.com / ${vendorSeedPassword} (OfficeWorld)`);
  console.log(`   Vendor3: vendor3@test.com / ${vendorSeedPassword} (NetGear Distributors)`);
  console.log('\n🔄 Workflow Test:');
  console.log('   1. Login as vendor → Go to Quotations tab → See open RFQs');
  console.log('   2. Submit quotation → Login as admin → Go to RFQ page');
  console.log('   3. Compare quotes → Select best → PO auto-created');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
