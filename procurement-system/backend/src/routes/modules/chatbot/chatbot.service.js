import prisma from '../../../config/db.js';
import env from '../../../config/env.js';

// Intent detection patterns
const intents = [
  { pattern: /stock|inventory|how many|available|quantity/i, intent: 'check_stock' },
  { pattern: /create.*request|purchase.*request|new.*request|order|buy/i, intent: 'create_request' },
  { pattern: /status|track|where.*order|my.*request/i, intent: 'track_order' },
  { pattern: /warranty|guarantee|expir/i, intent: 'check_warranty' },
  { pattern: /vendor|supplier/i, intent: 'vendor_info' },
  { pattern: /low.*stock|reorder|shortage/i, intent: 'low_stock' },
  { pattern: /help|what can you|commands/i, intent: 'help' },
];

function detectIntent(message) {
  for (const { pattern, intent } of intents) {
    if (pattern.test(message)) return intent;
  }
  return 'general';
}

function extractProductName(message) {
  // Remove common words to extract the product name
  const cleaned = message
    .replace(/do we have|how many|check stock|stock of|for|in stock|available|show|get|find|the|a|an|is|are|there|any/gi, '')
    .replace(/\?|!|\./g, '')
    .trim();
  return cleaned || null;
}

async function handleCheckStock(message) {
  const productName = extractProductName(message);
  if (!productName) {
    return { text: "I can check stock for you! Please specify a product name. For example: 'Do we have laptops in stock?'" };
  }

  const inventory = await prisma.inventory.findMany({
    where: {
      product: { name: { contains: productName, mode: 'insensitive' } },
    },
    include: { product: { include: { category: true } } },
  });

  if (inventory.length === 0) {
    return {
      text: `I couldn't find any products matching "${productName}". Try checking the inventory page or ask me differently.`,
      metadata: { intent: 'check_stock', query: productName, found: false },
    };
  }

  const items = inventory.map(i =>
    `• **${i.product.name}** (${i.product.sku}): ${i.quantity} ${i.product.unit} in stock${i.quantity <= i.reorderPoint ? ' ⚠️ LOW STOCK' : ' ✅'}`
  ).join('\n');

  return {
    text: `Here's what I found:\n\n${items}`,
    metadata: { intent: 'check_stock', query: productName, found: true, count: inventory.length },
  };
}

async function handleTrackOrder(message, user) {
  const requests = await prisma.purchaseRequest.findMany({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (requests.length === 0) {
    return { text: "You don't have any purchase requests yet. Would you like to create one?" };
  }

  const statusEmoji = {
    pending: '🟡',
    approved: '🟢',
    rejected: '🔴',
    rfq_sent: '📨',
    quotation_received: '📩',
    quotation_approved: '✅',
    wo_issued: '📄',
    dispatched: '🚚',
    at_gate: '🚧',
    documents_uploaded: '🗂️',
    bill_released: '💸',
    Pending: '🟡',
    Approved: '🟢',
    Rejected: '🔴',
  };
  const list = requests.map(r =>
    `• **${r.requestNo}** — ${statusEmoji[r.status] || '⚪'} ${r.status} — ${r.items.map(i => `${i.product.name} ×${i.quantity}`).join(', ')}`
  ).join('\n');

  return {
    text: `Here are your recent purchase requests:\n\n${list}`,
    metadata: { intent: 'track_order', count: requests.length },
  };
}

async function handleCheckWarranty(message) {
  const productName = extractProductName(message);

  const where = { status: 'Active' };
  if (productName) {
    where.product = { name: { contains: productName, mode: 'insensitive' } };
  }

  const warranties = await prisma.warranty.findMany({
    where,
    include: { product: true },
    orderBy: { endDate: 'asc' },
    take: 10,
  });

  if (warranties.length === 0) {
    return { text: productName ? `No active warranties found for "${productName}".` : 'No active warranties found.' };
  }

  const list = warranties.map(w => {
    const daysLeft = Math.ceil((new Date(w.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    const status = daysLeft <= 30 ? '⚠️' : '✅';
    return `• ${status} **${w.product.name}** — Expires: ${new Date(w.endDate).toLocaleDateString()} (${daysLeft} days left)${w.provider ? ` — Provider: ${w.provider}` : ''}`;
  }).join('\n');

  return {
    text: `Active warranties:\n\n${list}`,
    metadata: { intent: 'check_warranty', count: warranties.length },
  };
}

async function handleLowStock() {
  const lowStock = await prisma.$queryRaw`
    SELECT i.quantity, i."reorderPoint", p.name, p.sku, p.unit
    FROM "Inventory" i
    JOIN "Product" p ON p.id = i."productId"
    WHERE i.quantity <= i."reorderPoint"
    ORDER BY i.quantity ASC
    LIMIT 10
  `;

  if (lowStock.length === 0) {
    return { text: '✅ All items are well-stocked! No low-stock alerts at this time.' };
  }

  const list = lowStock.map(i =>
    `• ⚠️ **${i.name}** (${i.sku}): ${i.quantity}/${i.reorderPoint} ${i.unit}`
  ).join('\n');

  return {
    text: `🚨 **Low Stock Alert** — ${lowStock.length} items need attention:\n\n${list}\n\nConsider creating purchase requests for these items.`,
    metadata: { intent: 'low_stock', count: lowStock.length },
  };
}

async function handleVendorInfo(message) {
  const vendors = await prisma.vendor.findMany({
    where: { status: 'Active' },
    orderBy: { rating: 'desc' },
    take: 10,
  });

  if (vendors.length === 0) {
    return { text: 'No active vendors found in the system.' };
  }

  const list = vendors.map(v =>
    `• **${v.name}** — ⭐ ${v.rating}/5 — ${v.email}`
  ).join('\n');

  return {
    text: `Active vendors:\n\n${list}`,
    metadata: { intent: 'vendor_info', count: vendors.length },
  };
}

function handleHelp() {
  return {
    text: `I'm **InventBot**, your AI inventory assistant! Here's what I can do:\n\n` +
      `📦 **Check Stock** — "Do we have laptops in stock?"\n` +
      `📋 **Track Orders** — "What's the status of my requests?"\n` +
      `🛡️ **Check Warranty** — "Show warranty details for printer"\n` +
      `⚠️ **Low Stock** — "Show me low stock items"\n` +
      `🏢 **Vendor Info** — "List our vendors"\n` +
      `🛒 **Create Request** — "I need to order 5 monitors"\n\n` +
      `Just type your question naturally!`,
    metadata: { intent: 'help' },
  };
}

async function handleCreateRequest(message) {
  return {
    text: `To create a purchase request, please go to the **Purchase Requests** page and click "New Request". ` +
      `You can select products and quantities there.\n\n` +
      `Alternatively, I can help you check stock first — just ask "Do we have [product] in stock?"`,
    metadata: { intent: 'create_request' },
  };
}

// Gemini AI integration for general queries
async function handleWithGemini(message, user) {
  if (!env.GEMINI_API_KEY) {
    return {
      text: `I understand you're asking about "${message}". I'm currently running in basic mode. ` +
        `Try asking me about:\n• Stock levels\n• Order tracking\n• Warranties\n• Low stock alerts\n• Vendor information\n\n` +
        `Type **help** for the full list of commands!`,
      metadata: { intent: 'general', aiMode: 'basic' },
    };
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Get system context
    const stats = await prisma.inventory.aggregate({ _sum: { quantity: true } });
    const productCount = await prisma.product.count();
    const vendorCount = await prisma.vendor.count();

    const systemPrompt = `You are InventBot, an intelligent inventory management assistant. 
    Context: The system has ${productCount} products, ${stats._sum.quantity || 0} total units in inventory, and ${vendorCount} vendors.
    The user's name is ${user.name}. Be helpful, concise, and professional. 
    If the user asks about specific data, suggest they use natural commands like "check stock for [item]" or "show low stock items".`;

    const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
    const response = result.response.text();

    return {
      text: response,
      metadata: { intent: 'general', aiMode: 'gemini' },
    };
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return {
      text: `I had trouble processing that request. Try asking me about stock levels, orders, warranties, or vendors!`,
      metadata: { intent: 'general', error: true },
    };
  }
}

export async function processQuery(message, user) {
  const intent = detectIntent(message);

  switch (intent) {
    case 'check_stock': return handleCheckStock(message);
    case 'track_order': return handleTrackOrder(message, user);
    case 'check_warranty': return handleCheckWarranty(message);
    case 'low_stock': return handleLowStock();
    case 'vendor_info': return handleVendorInfo(message);
    case 'create_request': return handleCreateRequest(message);
    case 'help': return handleHelp();
    default: return handleWithGemini(message, user);
  }
}
