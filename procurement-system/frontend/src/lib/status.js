/**
 * Unified status → badge tone mapping. Tone names map to Badge component variants.
 * Keep this the single source of truth so a "pending" request looks the same everywhere.
 */
export const STATUS = {
  // Purchase requests (v3): pending → approved | rejected → rfq_sent → wo_issued → in_delivery → completed
  pending: { tone: 'amber', label: 'Pending approval' },
  approved: { tone: 'blue', label: 'Approved' },
  rejected: { tone: 'red', label: 'Rejected' },
  rfq_sent: { tone: 'violet', label: 'Quotations open' },
  wo_issued: { tone: 'indigo', label: 'Work order issued' },
  in_delivery: { tone: 'orange', label: 'In delivery' },
  completed: { tone: 'emerald', label: 'Completed' },
  // Quotations
  selected: { tone: 'emerald', label: 'Selected' },
  submitted: { tone: 'blue', label: 'Submitted' },
  // Work orders
  issued: { tone: 'violet', label: 'Issued' },
  // Shipments: invoiced → dispatched → (gate_blocked) → received → reviewed → bill_approved → paid
  invoiced: { tone: 'blue', label: 'Invoiced' },
  dispatched: { tone: 'orange', label: 'Dispatched' },
  gate_blocked: { tone: 'red', label: 'Blocked at gate' },
  received: { tone: 'teal', label: 'Awaiting review' },
  reviewed: { tone: 'pink', label: 'Awaiting bill approval' },
  bill_approved: { tone: 'indigo', label: 'Awaiting payment' },
  paid: { tone: 'emerald', label: 'Paid' },
  // Gate checks
  match: { tone: 'emerald', label: 'Matched' },
  mismatch: { tone: 'red', label: 'Mismatch' },
  // Generic
  active: { tone: 'emerald', label: 'Active' },
  invited: { tone: 'violet', label: 'Invited' },
  inactive: { tone: 'slate', label: 'Inactive' },
  expired: { tone: 'red', label: 'Expired' },
  expiring_soon: { tone: 'amber', label: 'Expiring Soon' },
  blacklisted: { tone: 'red', label: 'Blacklisted' },
  in_stock: { tone: 'emerald', label: 'In Stock' },
  low_stock: { tone: 'amber', label: 'Low Stock' },
  out_of_stock: { tone: 'red', label: 'Out of Stock' },
};

export const statusMeta = (status) =>
  STATUS[status] || {
    tone: 'slate',
    label: String(status || '—')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };

/** Order-cycle steps used by WorkflowTracker (0-based). */
export const WORKFLOW_STEPS = [
  { key: 'request', label: 'Request', sublabel: 'Faculty + letter' },
  { key: 'approval', label: 'HOD approval', sublabel: 'Approve / reject' },
  { key: 'quotations', label: 'Quotations', sublabel: 'Vendors quote' },
  { key: 'work_order', label: 'Work order', sublabel: 'Best quote selected' },
  { key: 'delivery', label: 'Delivery', sublabel: 'Invoice, dispatch, gate' },
  { key: 'review', label: 'Goods review', sublabel: 'Accept / reject qty' },
  { key: 'billing', label: 'Billing', sublabel: 'Approve & pay' },
];

/**
 * Step currently in progress for a request (index into WORKFLOW_STEPS;
 * WORKFLOW_STEPS.length = everything done). Uses shipments when present.
 */
export function orderStep(pr) {
  const shipments = (pr?.work_orders || []).flatMap((w) => w.shipments || []);
  switch (pr?.status) {
    case 'pending':
    case 'rejected':
      return 1;
    case 'approved':
    case 'rfq_sent':
      return 2;
    case 'wo_issued':
      return 4;
    case 'in_delivery':
      return shipments.some((s) => s.status === 'received') ? 5 : 4;
    case 'completed':
      return shipments.every((s) => ['paid', 'rejected'].includes(s.status)) ? WORKFLOW_STEPS.length : 6;
    default:
      return 0;
  }
}
