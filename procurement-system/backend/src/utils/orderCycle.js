// Shared rules for the order cycle (v3):
//   access scoping (HOD per department), per-item prices, remaining qty,
//   status sync (Shipment → WorkOrder → PurchaseRequest), notifications.
const crypto = require('crypto');
const prisma = require('../config/db');
const { sendNotice } = require('./mailer');

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// Shipment states that still hold quantity "in flight" (not yet reviewed).
const IN_FLIGHT = ['invoiced', 'dispatched', 'gate_blocked', 'received'];
// Shipment states whose accepted qty counts as delivered.
const REVIEWED = ['reviewed', 'bill_approved', 'paid', 'rejected'];

// ── Access scoping ───────────────────────────────────────────
// An Admin is the HOD of user.department. An Admin with no department
// sees every department (acts as super-admin).
const isHod = (user) => user?.role === 'Admin';

const sameDept = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Prisma `where` fragment for PurchaseRequest visible to this user.
function requestScope(user) {
  if (user.role === 'Department User') return { requested_by: user.user_id };
  if (isHod(user) && user.department) {
    return { user: { department: { equals: user.department, mode: 'insensitive' } } };
  }
  return {};
}

// pr must include { user: { department } }
function canManageRequest(user, pr) {
  if (!isHod(user)) return false;
  return !user.department || sameDept(user.department, pr.user?.department);
}

function canViewRequest(user, pr) {
  if (user.role === 'Department User') return pr.requested_by === user.user_id;
  if (isHod(user)) return canManageRequest(user, pr);
  return ['Accountant', 'Watchman'].includes(user.role);
}

// ── Prices and quantities ────────────────────────────────────
// wo must include { submission: { items }, request: { items } }.
// Returns Map(request_item_id → unit price as Number).
function unitPriceMap(wo) {
  const map = new Map();
  for (const qi of wo.submission?.items || []) map.set(qi.request_item_id, Number(qi.unit_price));
  const items = wo.request?.items || [];
  const missing = items.filter((i) => !map.has(i.item_id));
  if (missing.length) {
    // Legacy quotes had only a total: spread the remaining amount by quantity.
    const priced = items.filter((i) => map.has(i.item_id))
      .reduce((s, i) => s + map.get(i.item_id) * i.quantity, 0);
    const restQty = missing.reduce((s, i) => s + i.quantity, 0) || 1;
    const each = Math.max(0, Number(wo.agreed_price) - priced) / restQty;
    for (const i of missing) map.set(i.item_id, each);
  }
  return map;
}

// wo must include { request: { items }, shipments: { items } }.
// Returns [{ request_item_id, ordered, accepted, in_flight, remaining }]
function quantityLedger(wo) {
  return (wo.request?.items || []).map((item) => {
    let accepted = 0;
    let inFlight = 0;
    for (const sh of wo.shipments || []) {
      for (const si of sh.items || []) {
        if (si.request_item_id !== item.item_id) continue;
        if (IN_FLIGHT.includes(sh.status)) inFlight += si.qty_shipped;
        else if (REVIEWED.includes(sh.status)) accepted += si.qty_accepted || 0;
      }
    }
    return {
      request_item_id: item.item_id,
      product: item.product ? { product_id: item.product.product_id, name: item.product.name, unit: item.product.unit } : undefined,
      ordered: item.quantity,
      accepted,
      in_flight: inFlight,
      remaining: Math.max(0, item.quantity - accepted - inFlight),
    };
  });
}

const WO_LEDGER_INCLUDE = {
  submission: { include: { items: true } },
  request: { include: { items: { include: { product: true } }, user: true } },
  shipments: { include: { items: true } },
};

// Recompute WorkOrder + PurchaseRequest status from their shipments.
async function syncOrderStatus(tx, woId) {
  const wo = await tx.workOrder.findUnique({ where: { wo_id: woId }, include: WO_LEDGER_INCLUDE });
  if (!wo) return null;
  const ledger = quantityLedger(wo);
  const allAccepted = ledger.length > 0 && ledger.every((l) => l.accepted >= l.ordered);
  const woStatus = allAccepted ? 'completed' : wo.shipments.length ? 'in_delivery' : 'issued';
  const prStatus = { completed: 'completed', in_delivery: 'in_delivery', issued: 'wo_issued' }[woStatus];

  if (wo.status !== woStatus) await tx.workOrder.update({ where: { wo_id: woId }, data: { status: woStatus } });
  if (wo.request.status !== prStatus) {
    await tx.purchaseRequest.update({ where: { request_id: wo.request_id }, data: { status: prStatus } });
  }
  return { woStatus, prStatus, ledger };
}

// ── Codes and tokens ─────────────────────────────────────────
// 6-digit gate code, unique among shipments still expected at the gate.
async function generateGateCode(tx) {
  for (let i = 0; i < 20; i += 1) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const clash = await tx.shipment.findFirst({
      where: { gate_code: code, status: { in: ['dispatched', 'gate_blocked'] } },
      select: { shipment_id: true },
    });
    if (!clash) return code;
  }
  throw new Error('Could not allocate a unique gate code');
}

const newInviteToken = () => crypto.randomBytes(32).toString('hex');

// ── Recipients and notifications ─────────────────────────────
async function hodsFor(department) {
  const admins = await prisma.user.findMany({
    where: { role: { role_name: 'Admin' }, is_active: true },
    select: { user_id: true, name: true, email: true, department: true },
  });
  const own = admins.filter((a) => a.department && sameDept(a.department, department));
  return own.length ? own : admins.filter((a) => !a.department);
}

async function usersWithRole(roleName) {
  return prisma.user.findMany({
    where: { role: { role_name: roleName }, is_active: true },
    select: { user_id: true, name: true, email: true },
  });
}

// users: [{ user_id, email }]. email: sendNotice options without `to`.
// link: optional in-app path opened when the notification is clicked.
// Never throws — notifications must not break the workflow.
async function notify(users, { type, message, email, link }) {
  const list = (users || []).filter(Boolean);
  const unique = [...new Map(list.map((u) => [u.user_id ?? u.email, u])).values()];
  try {
    const withId = unique.filter((u) => u.user_id);
    if (withId.length) {
      await prisma.notification.createMany({
        data: withId.map((u) => ({ user_id: u.user_id, type, message, link: link || null })),
      });
    }
  } catch (err) {
    console.warn('[NOTIFY] in-app failed:', err.message);
  }
  if (email) {
    for (const u of unique) {
      if (!u.email) continue;
      sendNotice({ ...email, to: u.email }).catch((err) => console.warn('[NOTIFY] email failed:', err.message));
    }
  }
}

module.exports = {
  FRONTEND_URL,
  IN_FLIGHT,
  REVIEWED,
  WO_LEDGER_INCLUDE,
  isHod,
  sameDept,
  requestScope,
  canManageRequest,
  canViewRequest,
  unitPriceMap,
  quantityLedger,
  syncOrderStatus,
  generateGateCode,
  newInviteToken,
  hodsFor,
  usersWithRole,
  notify,
};
