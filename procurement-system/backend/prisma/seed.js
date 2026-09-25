const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   InventBot — Database Seeder              ║');
  console.log('║   Setting up fresh data...                 ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  // ─────────────────────────────────────────────
  // STEP 1: ROLES
  // ─────────────────────────────────────────────
  console.log('Creating roles...');

  const roleData = [
    { role_name: 'Admin',           permissions: { all: true } },
    { role_name: 'Department User', permissions: { create_pr: true, view_inventory: true } },
    { role_name: 'Vendor',          permissions: { portal: true, submit_quote: true, dispatch: true } },
    { role_name: 'Watchman',        permissions: { gate_entry: true, confirm_docs: true } },
    { role_name: 'Accountant',      permissions: { billing: true, release_bill: true } },
  ];

  const roles = {};
  for (const r of roleData) {
    const role = await prisma.role.upsert({
      where:  { role_name: r.role_name },
      update: { permissions: r.permissions },
      create: r,
    });
    roles[r.role_name] = role;
    console.log(`  ✅ Role: ${r.role_name} (id: ${role.role_id})`);
  }

  // ─────────────────────────────────────────────
  // STEP 2: DEFAULT USERS
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating default users...');

  const defaultUsers = [
    {
      name:       'System Admin',
      email:      'admin@college.edu',
      password:   'admin123',
      role:       'Admin',
      department: 'Administration',
      phone:      '9000000001',
    },
    {
      name:       'IT Department',
      email:      'itdept@college.edu',
      password:   'dept123',
      role:       'Department User',
      department: 'Information Technology',
      phone:      '9000000002',
    },
    {
      name:       'HR Department',
      email:      'hrdept@college.edu',
      password:   'dept123',
      role:       'Department User',
      department: 'Human Resources',
      phone:      '9000000003',
    },
    {
      name:       'Gate Watchman',
      email:      'watchman@college.edu',
      password:   'watch123',
      role:       'Watchman',
      department: null,
      phone:      '9000000004',
    },
    {
      name:       'College Accountant',
      email:      'accountant@college.edu',
      password:   'acc123',
      role:       'Accountant',
      department: null,
      phone:      '9000000005',
    },
  ];

  const createdUsers = {};
  for (const u of defaultUsers) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        name:       u.name,
        email:      u.email,
        password:   hashed,
        role_id:    roles[u.role].role_id,
        department: u.department,
        phone:      u.phone,
        is_active:  true,
      },
    });
    createdUsers[u.email] = user;
    console.log(`  ✅ User: ${u.email} / ${u.password}  [${u.role}]`);
  }

  // ─────────────────────────────────────────────
  // STEP 3: VENDORS WITH USER ACCOUNTS
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating vendor accounts...');

  const vendorData = [
    {
      company:  'TechSupply Solutions',
      contact:  'Rajesh Kumar',
      email:    'vendor1@techsupply.com',
      phone:    '9100000001',
      address:  '12 Industrial Area, Bengaluru - 560001',
      rating:   4.5,
    },
    {
      company:  'OfficeWorld Traders',
      contact:  'Priya Sharma',
      email:    'vendor2@officeworld.com',
      phone:    '9100000002',
      address:  '45 Commercial Complex, Mumbai - 400001',
      rating:   4.2,
    },
    {
      company:  'PrintMaster India',
      contact:  'Suresh Nair',
      email:    'vendor3@printmaster.com',
      phone:    '9100000003',
      address:  '78 Business Park, Chennai - 600001',
      rating:   3.8,
    },
  ];

  const createdVendors = {};
  for (const v of vendorData) {
    const hashed = await bcrypt.hash('vendor123', 10);

    // Create user account for vendor
    const user = await prisma.user.upsert({
      where:  { email: v.email },
      update: {},
      create: {
        name:      v.contact,
        email:     v.email,
        password:  hashed,
        role_id:   roles['Vendor'].role_id,
        is_active: true,
      },
    });

    // Create vendor record linked to user
    const vendor = await prisma.vendor.upsert({
      where:  { user_id: user.user_id },
      update: {},
      create: {
        user_id:       user.user_id,
        vendor_name:   v.company,
        company_name:  v.company,
        email:         v.email,
        phone:         v.phone,
        address:       v.address,
        rating:        v.rating,
        is_approved:   true,
        status:        'active',
      },
    });

    createdVendors[v.company] = vendor;
    console.log(`  ✅ Vendor: ${v.company} | Login: ${v.email} / vendor123`);
  }

  // ─────────────────────────────────────────────
  // STEP 4: PRODUCT CATEGORIES
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating product categories...');

  const categoryData = [
    { name: 'Computing & IT',    description: 'Laptops, desktops, servers, networking equipment' },
    { name: 'Office Furniture',  description: 'Chairs, desks, tables, storage units' },
    { name: 'Printing & Imaging',description: 'Printers, scanners, ink, toner, paper' },
    { name: 'Networking',        description: 'Routers, switches, cables, access points' },
    { name: 'Stationery',        description: 'Pens, notebooks, files, binding materials' },
    { name: 'Electrical',        description: 'UPS, power strips, extension cords, batteries' },
    { name: 'Cleaning Supplies', description: 'Cleaning agents, equipment, consumables' },
    { name: 'Lab Equipment',     description: 'Scientific instruments and lab consumables' },
    { name: 'Software Licenses', description: 'Operating systems, productivity software' },
    { name: 'AV Equipment',      description: 'Projectors, screens, microphones, speakers' },
  ];

  const createdCategories = {};
  for (const c of categoryData) {
    const cat = await prisma.category.create({ data: c });
    createdCategories[c.name] = cat;
    console.log(`  ✅ Category: ${c.name}`);
  }

  // ─────────────────────────────────────────────
  // STEP 5: PRODUCTS (30+ products)
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating products...');

  const productData = [

    // Computing & IT
    {
      category: 'Computing & IT',
      sku: 'LAPTOP-DELL-001',
      name: 'Dell Inspiron 15 Laptop',
      description: 'Intel Core i5, 8GB RAM, 512GB SSD, Windows 11',
      unit: 'piece',
      unit_price: 48000,
    },
    {
      category: 'Computing & IT',
      sku: 'LAPTOP-HP-002',
      name: 'HP Pavilion 14 Laptop',
      description: 'AMD Ryzen 5, 8GB RAM, 256GB SSD, Windows 11',
      unit: 'piece',
      unit_price: 42000,
    },
    {
      category: 'Computing & IT',
      sku: 'DESKTOP-LENOVO-003',
      name: 'Lenovo ThinkCentre Desktop',
      description: 'Intel Core i7, 16GB RAM, 1TB HDD, Windows 11 Pro',
      unit: 'piece',
      unit_price: 55000,
    },
    {
      category: 'Computing & IT',
      sku: 'MONITOR-LG-004',
      name: 'LG 24 inch Full HD Monitor',
      description: 'IPS Panel, 1080p, HDMI + VGA ports',
      unit: 'piece',
      unit_price: 12000,
    },
    {
      category: 'Computing & IT',
      sku: 'KEYBOARD-LOGIT-005',
      name: 'Logitech Wireless Keyboard',
      description: 'Full size, USB dongle, 2 year battery life',
      unit: 'piece',
      unit_price: 1800,
    },
    {
      category: 'Computing & IT',
      sku: 'MOUSE-LOGIT-006',
      name: 'Logitech Wireless Mouse',
      description: 'Optical, USB dongle, adjustable DPI',
      unit: 'piece',
      unit_price: 900,
    },
    {
      category: 'Computing & IT',
      sku: 'PENDRIVE-SAN-007',
      name: 'SanDisk 64GB USB Pendrive',
      description: 'USB 3.0, read speed 130MB/s',
      unit: 'piece',
      unit_price: 650,
    },
    {
      category: 'Computing & IT',
      sku: 'HDD-SEAG-008',
      name: 'Seagate 1TB External Hard Drive',
      description: 'USB 3.0, portable, black',
      unit: 'piece',
      unit_price: 3800,
    },
    {
      category: 'Computing & IT',
      sku: 'WEBCAM-LOGIT-009',
      name: 'Logitech C920 HD Webcam',
      description: '1080p, built-in microphone, auto-focus',
      unit: 'piece',
      unit_price: 5500,
    },

    // Office Furniture
    {
      category: 'Office Furniture',
      sku: 'CHAIR-EXEC-010',
      name: 'Executive Office Chair',
      description: 'High back, mesh, adjustable height, lumbar support',
      unit: 'piece',
      unit_price: 8500,
    },
    {
      category: 'Office Furniture',
      sku: 'CHAIR-STUDY-011',
      name: 'Study Chair',
      description: 'Standard padded seat, 4-leg frame, stackable',
      unit: 'piece',
      unit_price: 2200,
    },
    {
      category: 'Office Furniture',
      sku: 'DESK-COMP-012',
      name: 'Computer Desk',
      description: 'L-shaped, 1.2m × 0.6m, with cable management',
      unit: 'piece',
      unit_price: 6500,
    },
    {
      category: 'Office Furniture',
      sku: 'CABINET-FILE-013',
      name: 'Filing Cabinet',
      description: '4-drawer steel, A4 size, with lock',
      unit: 'piece',
      unit_price: 9000,
    },
    {
      category: 'Office Furniture',
      sku: 'SHELF-BOOK-014',
      name: 'Bookshelf 5 Tier',
      description: 'Wooden, 180cm height, 80cm width, white',
      unit: 'piece',
      unit_price: 4800,
    },

    // Printing & Imaging
    {
      category: 'Printing & Imaging',
      sku: 'PRINTER-HP-015',
      name: 'HP LaserJet Pro Printer',
      description: 'Monochrome, 30ppm, network ready, duplex printing',
      unit: 'piece',
      unit_price: 22000,
    },
    {
      category: 'Printing & Imaging',
      sku: 'PRINTER-CANON-016',
      name: 'Canon PIXMA Inkjet Printer',
      description: 'Color, WiFi, print/scan/copy, borderless printing',
      unit: 'piece',
      unit_price: 8500,
    },
    {
      category: 'Printing & Imaging',
      sku: 'TONER-HP-017',
      name: 'HP LaserJet Toner Cartridge',
      description: 'Black, 2000 page yield, genuine HP',
      unit: 'piece',
      unit_price: 3200,
    },
    {
      category: 'Printing & Imaging',
      sku: 'PAPER-A4-018',
      name: 'A4 Copier Paper',
      description: '75 GSM, 500 sheets per ream, white',
      unit: 'ream',
      unit_price: 320,
    },
    {
      category: 'Printing & Imaging',
      sku: 'SCANNER-EPSON-019',
      name: 'Epson Flatbed Scanner',
      description: '1200 DPI, A4 size, USB connectivity',
      unit: 'piece',
      unit_price: 7500,
    },

    // Networking
    {
      category: 'Networking',
      sku: 'ROUTER-TPLINK-020',
      name: 'TP-Link WiFi Router',
      description: 'AC1200, dual band, 4 antennas, up to 20 devices',
      unit: 'piece',
      unit_price: 2800,
    },
    {
      category: 'Networking',
      sku: 'SWITCH-CISCO-021',
      name: 'Cisco 24-Port Network Switch',
      description: 'Gigabit, unmanaged, rack-mountable',
      unit: 'piece',
      unit_price: 18000,
    },
    {
      category: 'Networking',
      sku: 'CABLE-CAT6-022',
      name: 'CAT6 Ethernet Cable 10m',
      description: 'RJ45 connectors, shielded, blue',
      unit: 'piece',
      unit_price: 280,
    },

    // Stationery
    {
      category: 'Stationery',
      sku: 'PEN-BALL-023',
      name: 'Cello Ball Pen',
      description: 'Blue ink, smooth writing, pack of 10',
      unit: 'pack',
      unit_price: 85,
    },
    {
      category: 'Stationery',
      sku: 'NOTEBOOK-A4-024',
      name: 'A4 Spiral Notebook',
      description: '200 pages, ruled, single line, hard cover',
      unit: 'piece',
      unit_price: 120,
    },
    {
      category: 'Stationery',
      sku: 'FILE-ARCH-025',
      name: 'Arch Lever File',
      description: 'A4, 70mm spine, PVC cover, assorted colors',
      unit: 'piece',
      unit_price: 95,
    },
    {
      category: 'Stationery',
      sku: 'MARKER-WHITE-026',
      name: 'Whiteboard Marker Set',
      description: '4 colors (black, blue, red, green), chisel tip',
      unit: 'set',
      unit_price: 160,
    },

    // Electrical
    {
      category: 'Electrical',
      sku: 'UPS-APC-027',
      name: 'APC 600VA UPS',
      description: '600VA / 360W, 2 battery backup outlets, surge protection',
      unit: 'piece',
      unit_price: 4500,
    },
    {
      category: 'Electrical',
      sku: 'STRIP-POWER-028',
      name: '6-Socket Power Strip with Surge Protection',
      description: '3 meter cord, individual switches, child-safe',
      unit: 'piece',
      unit_price: 850,
    },

    // AV Equipment
    {
      category: 'AV Equipment',
      sku: 'PROJECTOR-EPSON-029',
      name: 'Epson EB-X51 Projector',
      description: '3800 Lumens, XGA, HDMI + VGA, remote included',
      unit: 'piece',
      unit_price: 35000,
    },
    {
      category: 'AV Equipment',
      sku: 'SCREEN-PROJ-030',
      name: 'Projector Screen 100 inch',
      description: 'Tripod stand, matte white surface, 4:3 ratio',
      unit: 'piece',
      unit_price: 6500,
    },
    {
      category: 'AV Equipment',
      sku: 'MIC-WIRELESS-031',
      name: 'Wireless Microphone System',
      description: 'UHF, handheld + lapel, 50m range, receiver included',
      unit: 'set',
      unit_price: 8500,
    },

    // Lab Equipment
    {
      category: 'Lab Equipment',
      sku: 'SCOPE-MICRO-032',
      name: 'Binocular Microscope',
      description: '40x-1000x, LED illumination, coarse and fine focus',
      unit: 'piece',
      unit_price: 18000,
    },
    {
      category: 'Lab Equipment',
      sku: 'GLOVES-LAB-033',
      name: 'Latex Lab Gloves (Medium)',
      description: 'Powder-free, disposable, 100 pieces per box',
      unit: 'box',
      unit_price: 450,
    },

    // Software Licenses
    {
      category: 'Software Licenses',
      sku: 'MS-OFFICE-034',
      name: 'Microsoft Office 2021 License',
      description: 'Home and Business, Word/Excel/PowerPoint/Outlook, 1 PC',
      unit: 'license',
      unit_price: 7500,
    },
    {
      category: 'Software Licenses',
      sku: 'WIN-11-035',
      name: 'Windows 11 Pro License',
      description: 'Genuine Microsoft, OEM, 1 PC activation',
      unit: 'license',
      unit_price: 9500,
    },

    // Cleaning Supplies
    {
      category: 'Cleaning Supplies',
      sku: 'CLEAN-FLOOR-036',
      name: 'Floor Cleaning Liquid',
      description: 'Pine fragrance, 5 liter can, concentrated formula',
      unit: 'can',
      unit_price: 380,
    },
    {
      category: 'Cleaning Supplies',
      sku: 'TISSUE-BOX-037',
      name: 'Facial Tissue Box',
      description: '200 pulls, 2-ply, soft, pack of 5 boxes',
      unit: 'pack',
      unit_price: 220,
    },
  ];

  const createdProducts = {};
  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        category_id: createdCategories[p.category].category_id,
        sku:         p.sku,
        name:        p.name,
        description: p.description,
        unit:        p.unit,
        unit_price:  p.unit_price,
        is_active:   true,
      },
    });
    createdProducts[p.sku] = product;
    console.log(`  ✅ Product: ${p.name} (₹${p.unit_price.toLocaleString('en-IN')})`);
  }

  // ─────────────────────────────────────────────
  // STEP 6: WAREHOUSES
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating warehouses...');

  const warehouseData = [
    {
      name:         'Main Storeroom',
      location:     'Administrative Block, Ground Floor, Room 001',
      manager_name: 'Store Manager',
    },
    {
      name:         'IT Equipment Store',
      location:     'Computer Science Block, First Floor, Room 104',
      manager_name: 'IT Admin',
    },
    {
      name:         'Science Lab Store',
      location:     'Science Block, Basement, Room B-02',
      manager_name: 'Lab Technician',
    },
  ];

  const createdWarehouses = {};
  for (const w of warehouseData) {
    const warehouse = await prisma.warehouse.create({ data: w });
    createdWarehouses[w.name] = warehouse;
    console.log(`  ✅ Warehouse: ${w.name}`);
  }

  // ─────────────────────────────────────────────
  // STEP 7: INVENTORY (stock levels for products)
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Setting up inventory stock levels...');

  const inventoryData = [

    // Main Storeroom — general items
    { sku: 'PAPER-A4-018',    warehouse: 'Main Storeroom',      qty: 45,  reorder: 20, min: 10, max: 100 },
    { sku: 'PEN-BALL-023',    warehouse: 'Main Storeroom',      qty: 120, reorder: 30, min: 20, max: 200 },
    { sku: 'NOTEBOOK-A4-024', warehouse: 'Main Storeroom',      qty: 60,  reorder: 20, min: 10, max: 150 },
    { sku: 'FILE-ARCH-025',   warehouse: 'Main Storeroom',      qty: 35,  reorder: 15, min: 10, max: 100 },
    { sku: 'MARKER-WHITE-026',warehouse: 'Main Storeroom',      qty: 8,   reorder: 10, min: 5,  max: 50  },
    { sku: 'TONER-HP-017',    warehouse: 'Main Storeroom',      qty: 4,   reorder: 5,  min: 2,  max: 20  },
    { sku: 'CLEAN-FLOOR-036', warehouse: 'Main Storeroom',      qty: 12,  reorder: 8,  min: 4,  max: 30  },
    { sku: 'TISSUE-BOX-037',  warehouse: 'Main Storeroom',      qty: 25,  reorder: 10, min: 5,  max: 60  },
    { sku: 'STRIP-POWER-028', warehouse: 'Main Storeroom',      qty: 6,   reorder: 4,  min: 2,  max: 20  },
    { sku: 'CABLE-CAT6-022',  warehouse: 'Main Storeroom',      qty: 20,  reorder: 10, min: 5,  max: 50  },

    // IT Equipment Store
    { sku: 'LAPTOP-DELL-001', warehouse: 'IT Equipment Store',  qty: 12,  reorder: 5,  min: 3,  max: 30  },
    { sku: 'LAPTOP-HP-002',   warehouse: 'IT Equipment Store',  qty: 8,   reorder: 4,  min: 2,  max: 20  },
    { sku: 'DESKTOP-LENOVO-003',warehouse:'IT Equipment Store', qty: 5,   reorder: 3,  min: 1,  max: 15  },
    { sku: 'MONITOR-LG-004',  warehouse: 'IT Equipment Store',  qty: 18,  reorder: 6,  min: 3,  max: 40  },
    { sku: 'KEYBOARD-LOGIT-005',warehouse:'IT Equipment Store', qty: 22,  reorder: 8,  min: 4,  max: 50  },
    { sku: 'MOUSE-LOGIT-006', warehouse: 'IT Equipment Store',  qty: 25,  reorder: 8,  min: 4,  max: 50  },
    { sku: 'PENDRIVE-SAN-007',warehouse: 'IT Equipment Store',  qty: 40,  reorder: 15, min: 10, max: 80  },
    { sku: 'HDD-SEAG-008',    warehouse: 'IT Equipment Store',  qty: 7,   reorder: 4,  min: 2,  max: 20  },
    { sku: 'WEBCAM-LOGIT-009',warehouse: 'IT Equipment Store',  qty: 3,   reorder: 3,  min: 1,  max: 10  },
    { sku: 'ROUTER-TPLINK-020',warehouse:'IT Equipment Store',  qty: 6,   reorder: 3,  min: 1,  max: 15  },
    { sku: 'SWITCH-CISCO-021',warehouse: 'IT Equipment Store',  qty: 2,   reorder: 2,  min: 1,  max: 8   },
    { sku: 'UPS-APC-027',     warehouse: 'IT Equipment Store',  qty: 9,   reorder: 4,  min: 2,  max: 20  },
    { sku: 'PRINTER-HP-015',  warehouse: 'IT Equipment Store',  qty: 4,   reorder: 2,  min: 1,  max: 10  },
    { sku: 'PRINTER-CANON-016',warehouse:'IT Equipment Store',  qty: 3,   reorder: 2,  min: 1,  max: 8   },
    { sku: 'SCANNER-EPSON-019',warehouse:'IT Equipment Store',  qty: 2,   reorder: 2,  min: 1,  max: 6   },
    { sku: 'MS-OFFICE-034',   warehouse: 'IT Equipment Store',  qty: 15,  reorder: 5,  min: 3,  max: 30  },
    { sku: 'WIN-11-035',      warehouse: 'IT Equipment Store',  qty: 10,  reorder: 5,  min: 2,  max: 25  },

    // Main Storeroom — furniture and AV
    { sku: 'CHAIR-EXEC-010',  warehouse: 'Main Storeroom',      qty: 5,   reorder: 3,  min: 1,  max: 20  },
    { sku: 'CHAIR-STUDY-011', warehouse: 'Main Storeroom',      qty: 30,  reorder: 10, min: 5,  max: 80  },
    { sku: 'DESK-COMP-012',   warehouse: 'Main Storeroom',      qty: 4,   reorder: 2,  min: 1,  max: 15  },
    { sku: 'CABINET-FILE-013',warehouse: 'Main Storeroom',      qty: 6,   reorder: 3,  min: 1,  max: 15  },
    { sku: 'SHELF-BOOK-014',  warehouse: 'Main Storeroom',      qty: 8,   reorder: 3,  min: 1,  max: 20  },
    { sku: 'PROJECTOR-EPSON-029',warehouse:'Main Storeroom',    qty: 3,   reorder: 2,  min: 1,  max: 8   },
    { sku: 'SCREEN-PROJ-030', warehouse: 'Main Storeroom',      qty: 4,   reorder: 2,  min: 1,  max: 10  },
    { sku: 'MIC-WIRELESS-031',warehouse: 'Main Storeroom',      qty: 2,   reorder: 2,  min: 1,  max: 6   },

    // Science Lab Store
    { sku: 'SCOPE-MICRO-032', warehouse: 'Science Lab Store',   qty: 5,   reorder: 2,  min: 1,  max: 10  },
    { sku: 'GLOVES-LAB-033',  warehouse: 'Science Lab Store',   qty: 15,  reorder: 8,  min: 4,  max: 40  },
  ];

  let inventoryCount = 0;
  for (const item of inventoryData) {
    const product  = createdProducts[item.sku];
    const warehouse = createdWarehouses[item.warehouse];

    if (!product || !warehouse) {
      console.log(`  ⚠️  Skipping inventory for ${item.sku} — product or warehouse not found`);
      continue;
    }

    await prisma.inventory.create({
      data: {
        product_id:         product.product_id,
        warehouse_id:       warehouse.warehouse_id,
        quantity_available: item.qty,
        reorder_point:      item.reorder,
        min_stock:          item.min,
        max_stock:          item.max,
      },
    });
    inventoryCount++;
  }
  console.log(`  ✅ Created ${inventoryCount} inventory entries`);

  // ─────────────────────────────────────────────
  // STEP 8: WARRANTIES (for existing equipment)
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating sample warranties...');

  const today = new Date();
  const vendor1 = Object.values(createdVendors)[0];

  const warrantyData = [
    {
      sku:           'LAPTOP-DELL-001',
      serial:        'DELL-SN-2024-0001',
      start:         new Date('2024-01-15'),
      end:           new Date('2027-01-15'),
    },
    {
      sku:           'PROJECTOR-EPSON-029',
      serial:        'EPSON-PROJ-2023-0042',
      start:         new Date('2023-06-01'),
      end:           new Date(today.getFullYear(), today.getMonth(), today.getDate() + 25),
      // Expires in 25 days — will show as expiring soon
    },
    {
      sku:           'SWITCH-CISCO-021',
      serial:        'CISCO-SW-2022-0003',
      start:         new Date('2022-03-10'),
      end:           new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8),
      // Expires in 8 days — critical
    },
    {
      sku:           'UPS-APC-027',
      serial:        'APC-UPS-2023-0015',
      start:         new Date('2023-08-20'),
      end:           new Date('2025-08-20'),
    },
    {
      sku:           'PRINTER-HP-015',
      serial:        'HP-PRINT-2024-0007',
      start:         new Date('2024-03-01'),
      end:           new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      // Already expired — 5 days ago
    },
  ];

  for (const w of warrantyData) {
    const product = createdProducts[w.sku];
    if (!product || !vendor1) continue;

    await prisma.warranty.create({
      data: {
        product_id:    product.product_id,
        vendor_id:     vendor1.vendor_id,
        serial_number: w.serial,
        start_date:    w.start,
        end_date:      w.end,
        notified:      false,
      },
    });

    const daysLeft = Math.ceil((w.end - today) / (1000 * 60 * 60 * 24));
    const status = daysLeft < 0
      ? '🔴 EXPIRED'
      : daysLeft <= 10
      ? '🔴 CRITICAL'
      : daysLeft <= 30
      ? '⚠️  EXPIRING SOON'
      : '✅ Active';
    console.log(`  ${status} Warranty: ${product.name} | Days: ${daysLeft}`);
  }

  // ─────────────────────────────────────────────
  // STEP 9: SUBSCRIPTIONS
  // ─────────────────────────────────────────────
  console.log('');
  console.log('Creating subscriptions...');

  const subscriptionData = [
    {
      sku:          'MS-OFFICE-034',
      service:      'Microsoft 365 Business',
      expiry:       new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20),
      auto_renew:   false,
    },
    {
      sku:          'WIN-11-035',
      service:      'Windows Defender Antivirus',
      expiry:       new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()),
      auto_renew:   true,
    },
    {
      sku:          'LAPTOP-DELL-001',
      service:      'Dell SupportAssist Pro',
      expiry:       new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45),
      auto_renew:   false,
    },
  ];

  for (const s of subscriptionData) {
    const product = createdProducts[s.sku];
    if (!product) continue;

    await prisma.subscription.create({
      data: {
        product_id:   product.product_id,
        service_name: s.service,
        expiry_date:  s.expiry,
        auto_renew:   s.auto_renew,
        notified:     false,
      },
    });

    const daysLeft = Math.ceil((s.expiry - today) / (1000 * 60 * 60 * 24));
    const status = daysLeft <= 30 ? '⚠️  EXPIRING SOON' : '✅ Active';
    console.log(`  ${status} Subscription: ${s.service} | Days: ${daysLeft}`);
  }

  // ─────────────────────────────────────────────
  // DONE — Print summary
  // ─────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              InventBot Seeding Complete! ✅              ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  WHAT WAS CREATED:                                       ║');
  console.log(`║  • ${Object.keys(roles).length} Roles                                                ║`);
  console.log(`║  • ${Object.keys(createdUsers).length} Default user accounts                               ║`);
  console.log(`║  • ${Object.keys(createdVendors).length} Vendor accounts                                     ║`);
  console.log(`║  • ${Object.keys(createdCategories).length} Product categories                                   ║`);
  console.log(`║  • ${Object.keys(createdProducts).length} Products across all categories                    ║`);
  console.log(`║  • ${Object.keys(createdWarehouses).length} Warehouses                                          ║`);
  console.log(`║  • ${inventoryCount} Inventory entries                                ║`);
  console.log('║  • 5 Warranties (1 expired, 1 critical, 1 expiring soon) ║');
  console.log('║  • 3 Subscriptions (1 expiring soon)                     ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  LOGIN CREDENTIALS:                                      ║');
  console.log('║                                                          ║');
  console.log('║  Admin:      admin@college.edu       / admin123          ║');
  console.log('║  IT Dept:    itdept@college.edu      / dept123           ║');
  console.log('║  HR Dept:    hrdept@college.edu      / dept123           ║');
  console.log('║  Watchman:   watchman@college.edu    / watch123          ║');
  console.log('║  Accountant: accountant@college.edu  / acc123            ║');
  console.log('║                                                          ║');
  console.log('║  Vendor 1:   vendor1@techsupply.com  / vendor123         ║');
  console.log('║  Vendor 2:   vendor2@officeworld.com / vendor123         ║');
  console.log('║  Vendor 3:   vendor3@printmaster.com / vendor123         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  ALERTS SEEDED FOR TESTING:                              ║');
  console.log('║  • Projector warranty expires in 25 days                 ║');
  console.log('║  • Cisco Switch warranty expires in 8 days (critical)    ║');
  console.log('║  • HP Printer warranty already expired                   ║');
  console.log('║  • Microsoft 365 subscription expires in 20 days         ║');
  console.log('║  • Some items have LOW STOCK (marker sets, webcams etc)  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('You can now log in and start creating Purchase Requests!');
  console.log('');
}

seed()
  .catch((e) => {
    console.error('Seeding failed:', e.message);
    console.error(e.stack);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
