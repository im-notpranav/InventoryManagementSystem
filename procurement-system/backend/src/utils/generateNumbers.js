const prisma = require('../config/db');

const DEPT_MAP = {
  'information technology':'IT','it':'IT',
  'human resources':'HR','hr':'HR',
  'administration':'ADM','admin':'ADM',
  'finance':'FIN','operations':'OPS',
  'procurement':'PRC','marketing':'MKT','sales':'SLS',
};

const getDept = (dept) => {
  const raw = (dept || 'GEN').toLowerCase().trim();
  return DEPT_MAP[raw] || (dept || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'GEN';
};

const pad = (n) => String(n + 1).padStart(4, '0');

const generatePRNumber = async (department) => {
  try {
    const y = new Date().getFullYear();
    const d = getDept(department);

    // Safe count — if pr_number field does not exist, use total count
    let n = 0;
    try {
      n = await prisma.purchaseRequest.count({
        where: { pr_number: { startsWith: `PR-${y}-${d}` } }
      });
    } catch (countErr) {
      // pr_number field may not exist yet — fall back to total count
      n = await prisma.purchaseRequest.count();
    }

    return `PR-${y}-${d}-${pad(n)}`;
  } catch (err) {
    // Ultimate fallback — never crash
    const y = new Date().getFullYear();
    const ts = Date.now().toString().slice(-4);
    console.error('[generatePRNumber] Error, using fallback:', err.message);
    return `PR-${y}-GEN-${ts}`;
  }
};

const generatePONumber = async (vendorName) => {
  try {
    const y = new Date().getFullYear();
    const v = (vendorName || 'VND').replace(/[^a-zA-Z]/g,'').substring(0,3).toUpperCase();
    const n = await prisma.purchaseOrder.count({
      where: { po_number: { startsWith: `PO-${y}-${v}` } }
    });
    return `PO-${y}-${v}-${pad(n)}`;
  } catch (err) {
    const y = new Date().getFullYear();
    const ts = Date.now().toString().slice(-4);
    console.error('[generatePONumber] Error, using fallback:', err.message);
    return `PO-${y}-VND-${ts}`;
  }
};

const generateWONumber = async (department) => {
  try {
    const y = new Date().getFullYear();
    const d = getDept(department);

    // Get total WO count for uniqueness
    const n = await prisma.workOrder.count({
      where: { wo_number: { startsWith: `WO-${y}-${d}` } }
    });
    const candidate = `WO-${y}-${d}-${pad(n)}`;

    // Verify it does not already exist
    const exists = await prisma.workOrder.findUnique({
      where: { wo_number: candidate }
    }).catch(() => null);

    if (exists) {
      // If collision: use timestamp-based fallback
      const ts = Date.now().toString().slice(-4);
      return `WO-${y}-${d}-${ts}`;
    }

    return candidate;
  } catch (err) {
    const y = new Date().getFullYear();
    const ts = Date.now().toString().slice(-4);
    console.error('[generateWONumber] Error, using fallback:', err.message);
    return `WO-${y}-GEN-${ts}`;
  }
};

const generateGENumber = async () => {
  try {
    const y = new Date().getFullYear();
    const n = await prisma.gateEntry.count({
      where: { entry_number: { startsWith: `GE-${y}` } }
    });
    return `GE-${y}-${pad(n)}`;
  } catch (err) {
    const y = new Date().getFullYear();
    const ts = Date.now().toString().slice(-4);
    console.error('[generateGENumber] Error, using fallback:', err.message);
    return `GE-${y}-${ts}`;
  }
};

module.exports = { generatePRNumber, generatePONumber, generateWONumber, generateGENumber };
