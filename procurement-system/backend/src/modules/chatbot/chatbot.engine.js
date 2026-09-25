const INTENTS = [
  {
    name: 'CHECK_STOCK_ITEM',
    keywords: ['stock', 'quantity', 'how many', 'available', 'left', 'remaining', 'units', 'check', 'kitne', 'count of', 'do we have', 'inventory of', 'stock level'],
    requiresProduct: true,
    requiresQuantity: false,
    handler: 'handleCheckStockItem',
  },
  {
    name: 'CHECK_ALL_STOCK',
    keywords: ['all stock', 'full inventory', 'show inventory', 'all items', 'show all', 'complete stock', 'entire inventory', 'stock list', 'sabhi stock', 'everything in stock', 'whole inventory'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleCheckAllStock',
  },
  {
    name: 'LOW_STOCK_ALERT',
    keywords: ['low stock', 'running low', 'reorder', 'need to order', 'stock alert', 'shortage', 'less stock', 'kam stock', 'below minimum', 'critical stock', 'running out', 'almost finished', 'nearly gone'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleLowStock',
  },
  {
    name: 'OUT_OF_STOCK',
    keywords: ['out of stock', 'zero stock', 'no stock', 'unavailable', 'depleted'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleOutOfStock',
  },
  {
    name: 'CREATE_PURCHASE_REQUEST',
    keywords: ['order', 'purchase', 'buy', 'request', 'need', 'procure', 'khareedna', 'mangwao', 'get me', 'arrange', 'requisition', 'place order', 'create pr'],
    requiresProduct: true,
    requiresQuantity: true,
    handler: 'handleCreatePR',
  },
  {
    name: 'CHECK_MY_REQUESTS',
    keywords: ['my requests', 'my orders', 'my purchase', 'my pr', 'show my', 'meri requests', 'what i ordered', 'my pending', 'requests i made'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleMyRequests',
  },
  {
    name: 'CHECK_ALL_REQUESTS',
    keywords: ['all requests', 'pending requests', 'pending approvals', 'requests waiting', 'show requests', 'list requests', 'open requests', 'unapproved requests', 'waiting approval'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleAllRequests',
  },
  {
    name: 'CHECK_REQUEST_STATUS',
    keywords: ['status of pr', 'track pr', 'where is pr', 'pr status', 'request status', 'track request', 'pr kahan hai'],
    pattern: /PR-\d{4}-[A-Z]+-\d{4}/i,
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleRequestStatus',
  },
  {
    name: 'CHECK_WORK_ORDERS',
    keywords: ['work order', 'work orders', 'dispatched orders', 'active orders', 'wo', 'dispatch', 'dispatched', 'show wo', 'list work orders'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleWorkOrders',
  },
  {
    name: 'CHECK_WO_STATUS',
    keywords: [],
    pattern: /WO-\d{4}-[A-Z]+-\d{4}/i,
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleWOStatus',
  },
  {
    name: 'LIST_VENDORS',
    keywords: ['vendor', 'vendors', 'supplier', 'suppliers', 'vendor list', 'approved vendors', 'show vendors', 'who supplies', 'who sells', 'vendor for', 'supplier list'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleListVendors',
  },
  {
    name: 'CHECK_EXPIRING_WARRANTIES',
    keywords: ['warranty', 'warranties', 'expiring warranty', 'end of warranty', 'warranty expiry', 'warranty status', 'warranty check', 'guarantee'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleExpiringWarranties',
  },
  {
    name: 'CHECK_SUBSCRIPTIONS',
    keywords: ['subscription', 'license', 'renewal', 'software expiry'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleExpiringSubscriptions',
  },
  {
    name: 'DAILY_SUMMARY',
    keywords: ['attention', 'summary', 'overview', 'dashboard', 'urgent', 'alerts', 'today', 'whats up', 'update me', 'brief me', 'status update', 'daily report', 'kya chal raha hai', 'morning update', 'aaj ka update', 'what happened', 'any updates', 'whats happening'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleDailySummary',
  },
  {
    name: 'CHECK_PENDING_BILLS',
    keywords: ['pending bill', 'pending payment', 'invoice pending', 'payment due', 'bill status', 'billing', 'unpaid bills', 'outstanding bills', 'payment status', 'bills to release', 'accountant pending'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handlePendingBills',
  },
  {
    name: 'ORDER_HISTORY',
    keywords: ['order history', 'recent orders', 'past orders', 'completed orders', 'previous orders', 'purchase history'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleOrderHistory',
  },
  {
    name: 'INVENTORY_VALUE',
    keywords: ['total value', 'inventory worth', 'stock value', 'worth how much', 'value of stock', 'inventory cost'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleInventoryValue',
  },
  {
    name: 'HELP',
    keywords: ['help', 'what can you', 'commands', 'how to use', 'capabilities', 'features'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleHelp',
  },
  {
    name: 'GREETING',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'howdy', 'sup'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleGreeting',
  },
  {
    name: 'CHECK_CATEGORIES',
    keywords: ['categories', 'product categories', 'show categories', 'list categories', 'category'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleCategories',
  },
  {
    name: 'SYSTEM_STATUS',
    keywords: ['system status', 'server status', 'uptime', 'health check', 'is system running', 'system health'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleSystemStatus',
  },
  {
    name: 'THANK_YOU',
    keywords: ['thank', 'thanks', 'thank you', 'thx', 'appreciated', 'helpful'],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleThankYou',
  },
  {
    name: 'UNKNOWN',
    keywords: [],
    requiresProduct: false,
    requiresQuantity: false,
    handler: 'handleUnknown',
  },
];

const UNKNOWN_INTENT = INTENTS.find((intent) => intent.name === 'UNKNOWN');

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Levenshtein distance for fuzzy matching
const levenshtein = (a, b) => {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: an + 1 }, (_, i) =>
    Array.from({ length: bn + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[an][bn];
};

const fuzzyMatch = (input, target, threshold = 2) => {
  if (!input || !target) return false;
  const a = input.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (a === t) return true;
  if (a.includes(t) || t.includes(a)) return true;
  if (a.length >= 4 && t.length >= 4) {
    return levenshtein(a, t) <= threshold;
  }
  return false;
};
const formatNumber = (n) => Number(n || 0).toLocaleString('en-IN');
const formatCurrency = (n) => `₹${formatNumber(n)}`;
const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

const statusEmoji = (status) => {
  const key = String(status || '').toLowerCase();
  const map = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    dispatched: '🚚',
    completed: '✅',
    rfq_sent: '📤',
    quotation_received: '📩',
    quotation_approved: '✅',
    acknowledged: '👍',
    draft: '📝',
    issued: '📋',
    bill_released: '💰',
    at_gate: '🚪',
    blocked: '🚫',
    uploaded: '📎',
    admin_signed: '✍️',
    watchman_confirmed: '🛡️',
    ready_for_accountant: '📋',
    released: '💰',
    documents_uploaded: '📂',
    wo_created: '📦',
  };
  return map[key] || '📌';
};

const priorityEmoji = (priority) => {
  const key = String(priority || '').toLowerCase();
  const map = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴',
  };
  return map[key] || '🟡';
};

const PRODUCT_SYNONYMS = {
  laptop: ['computer', 'macbook', 'pc', 'notebook', 'lappy', 'thinkpad', 'chromebook', 'ultrabook', 'lenovo'],
  desktop: ['workstation', 'computer', 'pc', 'tower', 'cpu'],
  monitor: ['screen', 'display', 'lcd', 'led', 'vdu'],
  printer: ['printers', 'printing', 'laserjet', 'inkjet', 'scanner'],
  keyboard: ['keypad', 'kb', 'typing board'],
  mouse: ['mice', 'pointing device', 'trackpad'],
  projector: ['beamer', 'projection', 'overhead projector'],
  chair: ['chairs', 'seating', 'seat', 'kursi', 'office chair'],
  desk: ['table', 'workstation', 'mez'],
  cable: ['wire', 'cord', 'cables', 'wires', 'hdmi', 'usb cable'],
  router: ['wifi', 'wireless', 'networking', 'modem', 'access point'],
  switch: ['network switch', 'ethernet switch', 'hub'],
  pen: ['pens', 'ballpoint', 'marker', 'markers'],
  paper: ['papers', 'a4', 'ream', 'stationery'],
  toner: ['cartridge', 'ink', 'refill'],
  fan: ['fans', 'ceiling fan', 'table fan', 'pankha'],
  ac: ['air conditioner', 'air conditioning', 'split ac', 'window ac'],
};

const MSG_SYNONYMS = {
  'procure': 'order', 'acquire': 'order', 'get me': 'order',
  'i need': 'order', 'we need': 'order', 'require': 'order',
  'khareedna': 'order', 'mangwao': 'order', 'chahiye': 'order',
  'arrange for': 'order', 'requisition': 'order',
  'how much': 'how many', 'quantity of': 'how many',
  'kitne': 'how many', 'kitna': 'how many',
  'tell me about': 'show', 'what about': 'check',
  'dikhao': 'show', 'batao': 'show', 'dikha do': 'show',
  'running out': 'low stock', 'reorder needed': 'low stock',
  'almost finished': 'low stock', 'critically low': 'low stock',
  'khatam ho raha': 'low stock', 'kam hai': 'low stock',
  'active orders': 'work orders', 'ongoing orders': 'work orders',
  'supplier': 'vendor', 'suppliers': 'vendors',
  'licence': 'subscription', 'license': 'subscription',
  'alert': 'summary', 'urgent': 'summary',
  'what should i do': 'summary', 'overview': 'summary',
  'how are we doing': 'summary', 'whats new': 'summary',
  'aaj ka update': 'summary', 'kya chal raha': 'summary',
  'show me': 'show', 'display': 'show', 'list': 'show',
  'bring up': 'show', 'pull up': 'show',
  'place order': 'order', 'make request': 'order',
  'can i get': 'order', 'need more': 'order',
  'remaining stock': 'how many', 'in stock': 'how many',
  'expiring': 'warranty', 'about to expire': 'warranty',
  'who sells': 'vendor', 'vendor for': 'vendor',
  'bill status': 'pending bill', 'payment status': 'pending bill',
  'unpaid': 'pending bill', 'outstanding': 'pending bill',
  'kab milega': 'track pr', 'kab aayega': 'track pr',
  'delivery kab': 'work orders', 'dispatch kab': 'work orders',
};

const normalize = (msg) => msg
  .toLowerCase()
  .replace(/[.,!?;:'"]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const expandSynonyms = (msg) => {
  let expanded = msg;
  Object.entries(MSG_SYNONYMS).forEach(([syn, kw]) => {
    expanded = expanded.replace(new RegExp(syn, 'gi'), kw);
  });
  return expanded;
};

const matchProduct = (message, products = []) => {
  const text = String(message || '').toLowerCase();
  if (!text || !products.length) return null;

  const sorted = [...products].sort((a, b) => String(b.name || '').length - String(a.name || '').length);
  for (const product of sorted) {
    const name = String(product.name || '').toLowerCase().trim();
    const sku = String(product.sku || '').toLowerCase().trim();
    if (!name && !sku) continue;

    const plural = name.endsWith('s') ? name : `${name}s`;
    const singular = name.endsWith('s') ? name.slice(0, -1) : name;

    const nameSynonyms = PRODUCT_SYNONYMS[singular] || [];

    const patterns = [name, plural, singular, ...nameSynonyms]
      .filter(Boolean)
      .map((variant) => new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'i'));

    if (sku && new RegExp(`\\b${escapeRegExp(sku)}\\b`, 'i').test(text)) return product;
    if (patterns.some((pattern) => pattern.test(text))) return product;
  }

  // Fuzzy fallback: check each word in input against product names
  const inputWords = text.split(/\s+/).filter(w => w.length >= 3);
  let bestMatch = null;
  let bestDist = Infinity;

  for (const product of sorted) {
    const name = String(product.name || '').toLowerCase().trim();
    if (!name || name.length < 3) continue;

    for (const word of inputWords) {
      const dist = levenshtein(word, name);
      if (dist <= 2 && dist < bestDist) {
        bestDist = dist;
        bestMatch = product;
      }
      // Also check singular form
      const singular = name.endsWith('s') ? name.slice(0, -1) : name;
      const singDist = levenshtein(word, singular);
      if (singDist <= 2 && singDist < bestDist) {
        bestDist = singDist;
        bestMatch = product;
      }
    }
  }

  return bestMatch;
};

const detectIntent = (message, products = []) => {
  const raw = String(message || '').toLowerCase().trim();
  const text = expandSynonyms(normalize(raw));
  const scores = INTENTS
    .filter((intent) => intent.name !== 'UNKNOWN')
    .map((intent) => {
      let score = 0;
      for (const keyword of intent.keywords || []) {
        const normalizedKeyword = String(keyword || '').toLowerCase().trim();
        if (!normalizedKeyword) continue;
        if (normalizedKeyword.includes(' ')) {
          // Multi-word keyword: exact substring match = 3 pts
          if (text.includes(normalizedKeyword)) score += 3;
          // Fuzzy multi-word: 1.5 pts
          else {
            const words = text.split(' ');
            const kwWords = normalizedKeyword.split(' ');
            if (kwWords.every(kw => words.some(w => fuzzyMatch(w, kw, 1)))) {
              score += 1.5;
            }
          }
        } else {
          const pattern = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, 'i');
          if (pattern.test(text)) {
            score += 1;
          } else {
            // Fuzzy single-word: check each word in the input
            const words = text.split(/\s+/);
            if (words.some(w => fuzzyMatch(w, normalizedKeyword, 1))) {
              score += 0.7; // Partial credit for fuzzy match
            }
          }
        }
      }
      if (intent.pattern && intent.pattern.test(text)) score += 10;
      return { intent, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scores[0] || { intent: UNKNOWN_INTENT, score: 0 };
  const extractedProduct = matchProduct(text, products);
  const qtyMatch = text.match(/\b(\d+)\b/);
  const extractedQuantity = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;

  let extractedPriority = 'medium';
  if (/\b(urgent|urgently|asap|immediately)\b/i.test(text)) extractedPriority = 'urgent';
  else if (/\b(high priority|important)\b/i.test(text)) extractedPriority = 'high';
  else if (/\b(low priority|whenever)\b/i.test(text)) extractedPriority = 'low';

  const extractedPRNumber = text.match(/PR-\d{4}-[A-Z]+-\d{4}/i)?.[0] || null;
  const extractedWONumber = text.match(/WO-\d{4}-[A-Z]+-\d{4}/i)?.[0] || null;

  if (best.score === 0) {
    // Fallback: if message matches a product name, assume CHECK_STOCK_ITEM
    if (extractedProduct) {
      const stockIntent = INTENTS.find((i) => i.name === 'CHECK_STOCK_ITEM');
      return {
        intent: stockIntent || UNKNOWN_INTENT,
        score: 1,
        extractedProduct,
        extractedQuantity,
        extractedPriority,
        extractedPRNumber,
        extractedWONumber,
      };
    }
    return {
      intent: UNKNOWN_INTENT,
      score: 0,
      extractedProduct,
      extractedQuantity,
      extractedPriority,
      extractedPRNumber,
      extractedWONumber,
    };
  }

  return {
    intent: best.intent,
    score: best.score,
    extractedProduct,
    extractedQuantity,
    extractedPriority,
    extractedPRNumber,
    extractedWONumber,
  };
};

const safeHandler = (handler, fallbackSuggestions = ['Help', 'Show inventory']) => async (args) => {
  try {
    return await handler(args);
  } catch (err) {
    return {
      text: `I ran into an issue while checking that: ${err.message}`,
      suggestions: fallbackSuggestions.slice(0, 4),
    };
  }
};

const handleCheckStockItem = safeHandler(async ({ prisma, extracted }) => {
  if (!extracted.extractedProduct) {
    return {
      text: "I couldn't identify the product. Please include a product name or SKU.",
      suggestions: ['Check all stock', 'Show low stock', 'List vendors'],
    };
  }
  const product = extracted.extractedProduct;
  const rows = await prisma.inventory.findMany({
    where: { product_id: product.product_id },
    include: { warehouse: true },
  });
  if (!rows.length) {
    return {
      text: `No inventory records found for ${product.name}.`,
      suggestions: [`Order ${product.name}`, 'Check all stock', 'Show low stock'],
    };
  }

  const lines = [`📦 Stock for ${product.name} (${product.sku || 'N/A'})`];
  let total = 0;
  let hasLow = false;
  for (const row of rows) {
    const qty = Number(row.quantity_available || 0);
    total += qty;
    const low = qty <= Number(row.reorder_point || 0);
    const out = qty === 0;
    hasLow = hasLow || low;
    const label = out ? '🔴 OUT' : low ? '⚠️ LOW' : '✅ OK';
    lines.push(`- ${row.warehouse?.name || 'Warehouse'}: ${formatNumber(qty)} ${product.unit || 'units'} | ${label} | Reorder ${formatNumber(row.reorder_point)} | Min ${formatNumber(row.min_stock)} | Max ${formatNumber(row.max_stock)}`);
  }
  if (rows.length > 1) lines.push(`Total across warehouses: ${formatNumber(total)} ${product.unit || 'units'}`);
  if (hasLow) lines.push(`⚠️ Reorder recommended for ${product.name}.`);

  return {
    text: lines.join('\n'),
    suggestions: hasLow ? [`Order ${product.name}`, 'Show low stock', 'Check pending requests'] : ['Show low stock', 'Check all stock', 'Create purchase request'],
  };
});

const handleCheckAllStock = safeHandler(async ({ prisma }) => {
  const inventory = await prisma.inventory.findMany({
    include: { product: { include: { category: true } }, warehouse: true },
    orderBy: { quantity_available: 'asc' },
  });
  if (!inventory.length) {
    return { text: 'No inventory data found.', suggestions: ['Add products', 'Show low stock', 'Help'] };
  }

  const outOfStock = inventory.filter((item) => Number(item.quantity_available) === 0);
  const lowStock = inventory.filter((item) => Number(item.quantity_available) > 0 && Number(item.quantity_available) <= Number(item.reorder_point || 0));
  const healthy = inventory.filter((item) => Number(item.quantity_available) > Number(item.reorder_point || 0));

  const block = (title, items) => {
    if (!items.length) return `${title}\n- None`;
    return `${title}\n${items.map((item) => `- ${item.product?.name} (${item.warehouse?.name || 'Warehouse'}): ${formatNumber(item.quantity_available)} ${item.product?.unit || 'units'} | RP ${formatNumber(item.reorder_point)}`).join('\n')}`;
  };

  return {
    text: `Inventory summary: ${inventory.length} records\n\n${block('🔴 Out of stock', outOfStock)}\n\n${block('⚠️ Low stock', lowStock)}\n\n${block('✅ Healthy stock', healthy)}`,
    suggestions: ['Show low stock', 'Out of stock items', 'Order critical items', 'Daily summary'],
  };
});

const handleLowStock = safeHandler(async ({ prisma }) => {
  const inventory = await prisma.inventory.findMany({
    include: { product: true, warehouse: true },
  });
  const lowItems = inventory.filter((item) => Number(item.quantity_available) <= Number(item.reorder_point || 0));
  if (!lowItems.length) {
    return {
      text: '✅ Great news — no items are currently at or below reorder point.',
      suggestions: ['Check all stock', 'Daily summary'],
    };
  }
  const lines = lowItems.map((item) => {
    const qty = Number(item.quantity_available || 0);
    const icon = qty === 0 ? '🔴' : '⚠️';
    return `${icon} ${item.product?.name}: ${formatNumber(qty)} left (reorder at ${formatNumber(item.reorder_point)}) in ${item.warehouse?.name || 'Warehouse'}`;
  });
  lines.push('Tip: type "order [name]" to create a purchase request quickly.');
  return {
    text: lines.join('\n'),
    suggestions: ['Order laptops', 'Check all stock', 'Show pending requests'],
  };
});

const handleOutOfStock = safeHandler(async ({ prisma }) => {
  const rows = await prisma.inventory.findMany({
    where: { quantity_available: 0 },
    include: { product: true, warehouse: true },
  });
  if (!rows.length) {
    return { text: 'No out-of-stock items right now.', suggestions: ['Show low stock', 'Check all stock'] };
  }
  return {
    text: `Out of stock items (${rows.length}):\n${rows.map((row) => `- ${row.product?.name} at ${row.warehouse?.name || 'Warehouse'}`).join('\n')}`,
    suggestions: ['Order critical items', 'Show low stock', 'Daily summary'],
  };
});

const handleCreatePR = safeHandler(async ({ prisma, userId, userDept, extracted }) => {
  if (!extracted.extractedProduct) {
    return {
      text: 'Please tell me which product you want to order.',
      suggestions: ['Order 5 laptops', 'Show low stock', 'Check all stock'],
    };
  }

  const warehouse = await prisma.warehouse.findFirst();
  if (!warehouse) {
    return {
      text: 'No warehouse is configured yet, so I cannot create a purchase request.',
      suggestions: ['Contact admin', 'Show inventory'],
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const rawDept = String(userDept || 'GEN').replace(/[^a-zA-Z]/g, '').toUpperCase();
  const deptCode = (rawDept || 'GEN').slice(0, 3).padEnd(3, 'X');
  const count = await prisma.purchaseRequest.count();
  const sequence = String(count + 1).padStart(4, '0');
  const prNumber = `PR-${year}-${deptCode}-${sequence}`;

  const created = await prisma.purchaseRequest.create({
    data: {
      pr_number: prNumber,
      requested_by: userId,
      product_id: extracted.extractedProduct.product_id,
      warehouse_id: warehouse.warehouse_id,
      quantity: extracted.extractedQuantity || 1,
      priority: extracted.extractedPriority || 'medium',
      justification: 'Requested via InventBot',
      status: 'pending',
    },
  });

  return {
    text: `✅ Purchase Request Created\n- PR Number: ${prNumber}\n- Product: ${extracted.extractedProduct.name}\n- Quantity: ${formatNumber(created.quantity)} ${extracted.extractedProduct.unit || 'units'}\n- Priority: ${priorityEmoji(created.priority)} ${String(created.priority).toUpperCase()}\n- Status: ${statusEmoji(created.status)} ${String(created.status).toUpperCase()}`,
    suggestions: ['Show my requests', `Status of ${prNumber}`, 'What needs my attention'],
    actionResult: {
      type: 'PURCHASE_REQUEST_CREATED',
      pr_number: created.pr_number,
      request_id: created.request_id,
      product_name: extracted.extractedProduct.name,
      quantity: created.quantity,
      priority: created.priority,
    },
  };
});

const handleMyRequests = safeHandler(async ({ prisma, userId }) => {
  const requests = await prisma.purchaseRequest.findMany({
    where: { requested_by: userId },
    take: 10,
    orderBy: { requested_at: 'desc' },
    include: { product: true },
  });
  if (!requests.length) {
    return { text: 'You have no purchase requests yet.', suggestions: ['Order 2 laptops', 'Show all requests', 'Help'] };
  }
  return {
    text: `Your recent requests:\n${requests.map((item) => `- ${item.pr_number || `PR-${item.request_id}`}: ${item.product?.name} x${formatNumber(item.quantity)} | ${statusEmoji(item.status)} ${item.status} | ${priorityEmoji(item.priority)} ${item.priority} | ${formatDate(item.requested_at)}`).join('\n')}`,
    suggestions: ['Show all requests', 'Track PR status', 'Daily summary'],
  };
});

const handleAllRequests = safeHandler(async ({ prisma }) => {
  const requests = await prisma.purchaseRequest.findMany({
    take: 15,
    orderBy: { requested_at: 'desc' },
    include: { product: true, user: true },
  });
  if (!requests.length) {
    return { text: 'No purchase requests found.', suggestions: ['Create purchase request', 'Help'] };
  }
  const pending = requests.filter((item) => item.status === 'pending');
  const approved = requests.filter((item) => item.status === 'approved');
  const shownPending = pending.slice(0, 5);
  const overflow = pending.length - shownPending.length;
  return {
    text: `Request summary\n- Pending: ${pending.length}\n- Approved: ${approved.length}\n- Total (recent): ${requests.length}\n\nPending list:\n${shownPending.length ? shownPending.map((item) => `- ${item.pr_number || `PR-${item.request_id}`}: ${item.product?.name} x${formatNumber(item.quantity)} by ${item.user?.name || 'Unknown'}`).join('\n') : '- None'}${overflow > 0 ? `\n- ...and ${overflow} more pending requests` : ''}`,
    suggestions: ['Show my requests', 'Track PR-2026-IT-0001', 'Daily summary'],
  };
});

const nextStepByStatus = {
  pending: 'Waiting for admin approval',
  approved: 'Waiting for RFQ to vendors',
  rfq_sent: 'Awaiting vendor quotations',
  quotation_received: 'Admin is reviewing',
  quotation_approved: 'Work Order being prepared',
  wo_issued: 'Work Order issued to vendor',
  dispatched: 'Vendor has dispatched goods',
  at_gate: 'Goods are at the gate',
  documents_uploaded: 'Accountant review pending',
  bill_released: 'Procurement complete ✅',
  rejected: 'Request was rejected',
};

const handleRequestStatus = safeHandler(async ({ prisma, extracted }) => {
  if (!extracted.extractedPRNumber) {
    return {
      text: 'Please provide a PR number like PR-2026-IT-0001.',
      suggestions: ['Status of PR-2026-IT-0001', 'Show my requests'],
    };
  }
  const request = await prisma.purchaseRequest.findUnique({
    where: { pr_number: extracted.extractedPRNumber.toUpperCase() },
    include: { product: true, user: true, warehouse: true },
  });
  if (!request) {
    return {
      text: `I couldn't find ${extracted.extractedPRNumber}.`,
      suggestions: ['Show all requests', 'Show my requests'],
    };
  }
  const nextStep = nextStepByStatus[String(request.status || '').toLowerCase()] || 'Status updated. Please check with procurement admin.';
  return {
    text: `${statusEmoji(request.status)} ${request.pr_number}\n- Product: ${request.product?.name}\n- Quantity: ${formatNumber(request.quantity)} ${request.product?.unit || 'units'}\n- Requested by: ${request.user?.name || 'Unknown'}\n- Warehouse: ${request.warehouse?.name || 'N/A'}\n- Priority: ${priorityEmoji(request.priority)} ${request.priority}\n- Status: ${request.status}\n- Requested on: ${formatDate(request.requested_at)}\n- Estimated cost: ${request.estimated_cost ? formatCurrency(request.estimated_cost) : 'N/A'}\n\nNext step: ${nextStep}`,
    suggestions: ['Show all requests', 'Show work orders', 'Daily summary'],
  };
});

const handleWorkOrders = safeHandler(async ({ prisma }) => {
  const orders = await prisma.workOrder.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    include: { vendor: true, request: { include: { product: true } } },
  });
  if (!orders.length) {
    return { text: 'No work orders found.', suggestions: ['Show pending requests', 'Help'] };
  }
  return {
    text: `Recent work orders:\n${orders.map((wo) => `- ${wo.wo_number}: ${wo.items_description} | Qty ${formatNumber(wo.quantity)} | Vendor ${wo.vendor?.vendor_name || 'N/A'} | ${statusEmoji(wo.status)} ${wo.status}`).join('\n')}`,
    suggestions: ['Status of WO-2026-IT-0001', 'Show vendors', 'Daily summary'],
  };
});

const handleWOStatus = safeHandler(async ({ prisma, extracted }) => {
  if (!extracted.extractedWONumber) {
    return {
      text: 'Please provide a WO number like WO-2026-IT-0001.',
      suggestions: ['Status of WO-2026-IT-0001', 'Show work orders'],
    };
  }
  const wo = await prisma.workOrder.findUnique({
    where: { wo_number: extracted.extractedWONumber.toUpperCase() },
    include: { vendor: true, request: true, gate_entry: true },
  });
  if (!wo) {
    return { text: `I couldn't find ${extracted.extractedWONumber}.`, suggestions: ['Show work orders', 'Help'] };
  }
  const gate = wo.gate_entry
    ? `\nGate Entry\n- Entry No: ${wo.gate_entry.entry_number}\n- Vehicle: ${wo.gate_entry.vehicle_number}\n- Driver: ${wo.gate_entry.driver_name}\n- Status: ${statusEmoji(wo.gate_entry.status)} ${wo.gate_entry.status}`
    : '\nGate Entry\n- Not recorded yet';
  return {
    text: `${statusEmoji(wo.status)} ${wo.wo_number}\n- Description: ${wo.items_description}\n- Quantity: ${formatNumber(wo.quantity)}\n- Vendor: ${wo.vendor?.vendor_name || 'N/A'}\n- Agreed price: ${formatCurrency(wo.agreed_price)}\n- Delivery deadline: ${formatDate(wo.delivery_deadline)}\n- Status: ${wo.status}\n- Created: ${formatDate(wo.created_at)}${gate}`,
    suggestions: ['Show work orders', 'Show pending bills', 'Daily summary'],
  };
});

const handleListVendors = safeHandler(async ({ prisma }) => {
  const vendors = await prisma.vendor.findMany({ where: { is_approved: true }, take: 20 });
  if (!vendors.length) {
    return { text: 'No approved vendors found.', suggestions: ['Show work orders', 'Help'] };
  }
  return {
    text: `Approved vendors:\n${vendors.map((vendor) => `- ${vendor.vendor_name} | ${vendor.email} | Rating: ${vendor.rating != null ? vendor.rating : 'N/A'}`).join('\n')}`,
    suggestions: ['Show work orders', 'Pending approvals', 'Daily summary'],
  };
});

const handleExpiringWarranties = safeHandler(async ({ prisma }) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const warranties = await prisma.warranty.findMany({ include: { product: true, vendor: true } });
  const relevant = warranties.filter((item) => new Date(item.end_date) <= cutoff);
  if (!relevant.length) {
    return { text: 'No warranties expiring in the next 60 days.', suggestions: ['Show subscriptions', 'Daily summary'] };
  }
  const expired = relevant.filter((item) => daysUntil(item.end_date) < 0);
  const expiringSoon = relevant.filter((item) => daysUntil(item.end_date) >= 0);
  const section = (title, items, formatter) => `${title}\n${items.length ? items.map(formatter).join('\n') : '- None'}`;
  return {
    text: `${section('🔴 Already expired', expired, (item) => `- ${item.product?.name} (${item.vendor?.vendor_name || 'Vendor'}) | Ended ${formatDate(item.end_date)}`)}\n\n${section('⚠️ Expiring soon', expiringSoon, (item) => `- ${item.product?.name} (${item.vendor?.vendor_name || 'Vendor'}) | ${daysUntil(item.end_date)} day(s) left | Ends ${formatDate(item.end_date)}`)}`,
    suggestions: ['Show subscriptions', 'What needs my attention', 'Help'],
  };
});

const handleExpiringSubscriptions = safeHandler(async ({ prisma }) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const subscriptions = await prisma.subscription.findMany({ include: { product: true } });
  const relevant = subscriptions
    .filter((item) => new Date(item.expiry_date) <= cutoff)
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  if (!relevant.length) {
    return { text: 'No subscriptions expiring in the next 60 days.', suggestions: ['Expiring warranties', 'Daily summary'] };
  }
  const lines = relevant.map((item) => {
    const days = daysUntil(item.expiry_date);
    const status = days < 0 ? '🔴 EXPIRED' : days <= 7 ? '🔴 CRITICAL' : '⚠️ SOON';
    return `- ${item.service_name} (${item.product?.name || 'N/A'}) | ${status} | Expiry ${formatDate(item.expiry_date)} | Days ${days} | Auto renew: ${item.auto_renew ? 'Yes' : 'No'}`;
  });
  return {
    text: `Subscription expiry watchlist:\n${lines.join('\n')}`,
    suggestions: ['Expiring warranties', 'Pending bills', 'Daily summary'],
  };
});

const handleDailySummary = safeHandler(async ({ prisma }) => {
  const today = new Date();
  const within30 = new Date();
  within30.setDate(within30.getDate() + 30);

  const pendingBillsPromise = (async () => {
    try {
      return await prisma.billingDocument.findMany({ where: { status: 'ready_for_accountant' } });
    } catch {
      return [];
    }
  })();

  const [inventory, pendingPRs, activeWOs, warranties, subscriptions, pendingBills] = await Promise.all([
    prisma.inventory.findMany(),
    prisma.purchaseRequest.findMany({ where: { status: 'pending' } }),
    prisma.workOrder.findMany({ where: { status: { in: ['issued', 'acknowledged'] } } }),
    prisma.warranty.findMany({ where: { end_date: { gte: today, lte: within30 } } }),
    prisma.subscription.findMany({ where: { expiry_date: { gte: today, lte: within30 } } }),
    pendingBillsPromise,
  ]);

  const lowStock = inventory.filter((item) => Number(item.quantity_available) <= Number(item.reorder_point || 0));
  const outOfStockCount = inventory.filter((item) => Number(item.quantity_available) === 0).length;
  const summaryLines = [];
  if (pendingPRs.length > 0) summaryLines.push(`⏳ Pending Approvals: ${pendingPRs.length}`);
  if (activeWOs.length > 0) summaryLines.push(`📋 Active Work Orders: ${activeWOs.length}`);
  if (lowStock.length > 0) summaryLines.push(`⚠️ Low Stock: ${lowStock.length} items${outOfStockCount > 0 ? ` (+ 🔴 ${outOfStockCount} out of stock)` : ''}`);
  if (warranties.length > 0) summaryLines.push(`🛡️ Warranties: ${warranties.length} expiring in 30 days`);
  if (subscriptions.length > 0) summaryLines.push(`📅 Subscriptions: ${subscriptions.length} expiring in 30 days`);
  if (pendingBills.length > 0) summaryLines.push(`💰 Pending Bills: ${pendingBills.length}`);
  if (!summaryLines.length) summaryLines.push('✅ Everything looks stable right now.');

  const suggestions = [];
  if (pendingPRs.length > 0) suggestions.push('Show all requests');
  if (lowStock.length > 0) suggestions.push('Show low stock');
  if (activeWOs.length > 0) suggestions.push('Show work orders');
  if (warranties.length > 0 || subscriptions.length > 0) suggestions.push('Show expiries');
  if (pendingBills.length > 0) suggestions.push('Show pending bills');

  return {
    text: `InventBot Daily Summary\n${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\n${summaryLines.join('\n')}`,
    suggestions: (suggestions.length ? suggestions : ['Check all stock', 'Show my requests', 'Help']).slice(0, 4),
  };
});

const handlePendingBills = safeHandler(async ({ prisma }) => {
  let bills = [];
  try {
    bills = await prisma.billingDocument.findMany({ where: { status: 'ready_for_accountant' }, take: 10 });
  } catch {
    bills = [];
  }
  if (!bills.length) {
    return {
      text: 'No billing documents are pending accountant action right now.',
      suggestions: ['Daily summary', 'Show work orders'],
    };
  }
  return {
    text: `Pending bills for accountant: ${bills.length}\n- Ask the accountant to review and release these ready documents.`,
    suggestions: ['Daily summary', 'Show work orders', 'Show request status'],
  };
});

const handleHelp = safeHandler(async () => ({
  text: `Here is what I can do:
- Inventory: "how many laptops do we have", "show all stock", "show low stock"
- Purchase requests: "order 5 laptops urgently", "show my requests", "status of PR-2026-IT-0001"
- Work orders: "show work orders", "status of WO-2026-IT-0001"
- Vendors: "list approved vendors"
- Warranties & subscriptions: "expiring warranties", "show subscriptions expiring"
- Alerts: "what needs my attention", "show pending bills"
- System: "hello", "help"`,
  suggestions: ['What needs my attention', 'Show all stock', 'Order 2 laptops', 'Show work orders'],
}));

const handleGreeting = safeHandler(async ({ userName }) => {
  const name = userName || 'there';
  const greetings = [
    `Hello ${name}! 👋 Ready to manage inventory smarter today.`,
    `Hi ${name}! I am InventBot, your inventory assistant.`,
    `Hey ${name}! Need stock, requests, or work order updates?`,
    `Namaste ${name}! I can help with procurement and stock actions.`,
  ];
  const text = greetings[Math.floor(Math.random() * greetings.length)];
  return {
    text: `${text}\nAsk me about stock or type "help" to see everything I can do.`,
    suggestions: ['What needs my attention', 'Show low stock', 'Help'],
  };
});

const handleOrderHistory = safeHandler(async ({ prisma }) => {
  const orders = await prisma.purchaseRequest.findMany({
    take: 10,
    orderBy: { requested_at: 'desc' },
    include: { product: true, user: true },
  });
  if (!orders.length) {
    return { text: 'No order history found.', suggestions: ['Create purchase request', 'Help'] };
  }
  return {
    text: `Recent order history (last 10):\n${orders.map((o) => `- ${o.pr_number || `PR-${o.request_id}`}: ${o.product?.name} x${formatNumber(o.quantity)} | ${statusEmoji(o.status)} ${o.status} | by ${o.user?.name || 'Unknown'} | ${formatDate(o.requested_at)}`).join('\n')}`,
    suggestions: ['Show my requests', 'Daily summary', 'Show work orders'],
  };
});

const handleInventoryValue = safeHandler(async ({ prisma }) => {
  const inventory = await prisma.inventory.findMany({
    include: { product: true, warehouse: true },
  });
  if (!inventory.length) {
    return { text: 'No inventory data available to calculate value.', suggestions: ['Check all stock', 'Help'] };
  }
  let totalValue = 0;
  const itemValues = inventory.map((item) => {
    const qty = Number(item.quantity_available || 0);
    const price = Number(item.product?.unit_price || 0);
    const value = qty * price;
    totalValue += value;
    return { name: item.product?.name || 'Unknown', warehouse: item.warehouse?.name || 'Warehouse', qty, price, value };
  }).sort((a, b) => b.value - a.value);

  const top5 = itemValues.slice(0, 5);
  return {
    text: `💰 Total Inventory Value: ${formatCurrency(totalValue)}\n\nTop 5 most valuable items:\n${top5.map((i) => `- ${i.name} (${i.warehouse}): ${formatNumber(i.qty)} × ${formatCurrency(i.price)} = ${formatCurrency(i.value)}`).join('\n')}\n\nTotal items tracked: ${inventory.length}`,
    suggestions: ['Show low stock', 'Check all stock', 'Daily summary'],
  };
});

const handleCategories = safeHandler(async ({ prisma }) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });
  if (!categories.length) {
    return { text: 'No product categories found yet.', suggestions: ['Show all stock', 'Help'] };
  }
  const lines = categories.map((c) =>
    `- ${c.name}: ${c._count.products} product(s)${c.description ? ` — ${c.description}` : ''}`
  );
  return {
    text: `📂 Product Categories (${categories.length}):\n${lines.join('\n')}`,
    suggestions: ['Show all stock', 'Check low stock', 'Help'],
  };
});

const handleSystemStatus = safeHandler(async ({ prisma }) => {
  const [productCount, userCount, prCount, woCount] = await Promise.all([
    prisma.product.count(),
    prisma.user.count({ where: { is_active: true } }),
    prisma.purchaseRequest.count(),
    prisma.workOrder.count(),
  ]);
  const uptime = process.uptime();
  const hrs = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  return {
    text: `🖥️ System Status\n- Server uptime: ${hrs}h ${mins}m\n- Products: ${productCount}\n- Active users: ${userCount}\n- Purchase requests: ${prCount}\n- Work orders: ${woCount}\n- Status: ✅ All systems operational`,
    suggestions: ['Daily summary', 'Show all stock', 'Help'],
  };
});

const handleThankYou = safeHandler(async ({ userName }) => {
  const name = userName || 'there';
  const responses = [
    `You're welcome, ${name}! Happy to help. 😊`,
    `Glad I could assist, ${name}! Need anything else?`,
    `Anytime, ${name}! I'm here whenever you need me.`,
    `My pleasure, ${name}! Let me know if there's anything else.`,
  ];
  return {
    text: responses[Math.floor(Math.random() * responses.length)],
    suggestions: ['What needs my attention', 'Show low stock', 'Help'],
  };
});

const handleUnknown = safeHandler(async ({ message }) => ({
  text: `Hmm, I heard "${String(message || '').trim()}", but I'm not entirely sure what you need yet. Could you rephrase that?`,
  suggestions: ['How many laptops do we have?', 'Show low stock', 'What needs my attention', 'Help'],
}));

const HANDLER_MAP = {
  CHECK_STOCK_ITEM: handleCheckStockItem,
  CHECK_ALL_STOCK: handleCheckAllStock,
  LOW_STOCK_ALERT: handleLowStock,
  OUT_OF_STOCK: handleOutOfStock,
  CREATE_PURCHASE_REQUEST: handleCreatePR,
  CHECK_MY_REQUESTS: handleMyRequests,
  CHECK_ALL_REQUESTS: handleAllRequests,
  CHECK_REQUEST_STATUS: handleRequestStatus,
  CHECK_WORK_ORDERS: handleWorkOrders,
  CHECK_WO_STATUS: handleWOStatus,
  LIST_VENDORS: handleListVendors,
  CHECK_EXPIRING_WARRANTIES: handleExpiringWarranties,
  CHECK_SUBSCRIPTIONS: handleExpiringSubscriptions,
  DAILY_SUMMARY: handleDailySummary,
  CHECK_PENDING_BILLS: handlePendingBills,
  ORDER_HISTORY: handleOrderHistory,
  INVENTORY_VALUE: handleInventoryValue,
  TRACK_ORDER: handleRequestStatus,
  CATEGORY_STOCK: handleCategories,
  CHECK_CATEGORIES: handleCategories,
  SYSTEM_STATUS: handleSystemStatus,
  THANK_YOU: handleThankYou,
  HELP: handleHelp,
  GREETING: handleGreeting,
  UNKNOWN: handleUnknown,
};

const processMessage = async ({ prisma, message, userId, userRole, userName, userDept }) => {
  let products = [];
  try {
    products = await prisma.product.findMany({
      where: { is_active: true },
      select: { product_id: true, name: true, sku: true, unit: true, unit_price: true },
    });
  } catch (e) {}

  const extracted = detectIntent(message, products);
  const handler = HANDLER_MAP[extracted.intent.name] || handleUnknown;
  const result = await handler({ prisma, userId, userRole, userName, userDept, extracted, message });

  // Confidence messaging: if score < 2 and not GREETING/HELP, add hint
  if (extracted.score > 0 && extracted.score < 2 && !['GREETING', 'HELP'].includes(extracted.intent.name)) {
    result.text = (result.text || '') + '\n\n_I\'m not 100% certain I understood. Type **help** to see everything I can assist with._';
  }

  return { intent: extracted.intent.name, confidence: extracted.score, ...result };
};

module.exports = { processMessage, detectIntent, INTENTS };
