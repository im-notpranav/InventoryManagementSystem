/**
 * Unified status → badge tone mapping. Tone names map to Badge component variants.
 * Keep this the single source of truth so a "pending" PR looks the same everywhere.
 */
export const STATUS = {
  // Purchase requests
  pending: { tone: 'amber', label: 'Pending' },
  approved: { tone: 'blue', label: 'Approved' },
  rfq_sent: { tone: 'violet', label: 'RFQ Sent' },
  quotation_received: { tone: 'violet', label: 'Quotes In' },
  quotation_approved: { tone: 'indigo', label: 'Quote Approved' },
  dispatched: { tone: 'orange', label: 'Dispatched' },
  gate_entry: { tone: 'teal', label: 'At Gate' },
  grn_created: { tone: 'teal', label: 'Received' },
  bill_released: { tone: 'emerald', label: 'Bill Released' },
  rejected: { tone: 'red', label: 'Rejected' },
  // Work orders
  draft: { tone: 'slate', label: 'Draft' },
  issued: { tone: 'violet', label: 'Issued' },
  acknowledged: { tone: 'blue', label: 'Acknowledged' },
  wo_issued: { tone: 'amber', label: 'WO Issued' },
  completed: { tone: 'emerald', label: 'Completed' },
  // Billing docs
  uploaded: { tone: 'blue', label: 'Uploaded' },
  admin_signed: { tone: 'indigo', label: 'Admin Signed' },
  watchman_confirmed: { tone: 'teal', label: 'Security Confirmed' },
  ready_for_accountant: { tone: 'pink', label: 'Ready for Accounts' },
  released: { tone: 'emerald', label: 'Released' },
  // Generic
  active: { tone: 'emerald', label: 'Active' },
  inactive: { tone: 'slate', label: 'Inactive' },
  expired: { tone: 'red', label: 'Expired' },
  expiring_soon: { tone: 'amber', label: 'Expiring Soon' },
  blacklisted: { tone: 'red', label: 'Blacklisted' },
  submitted: { tone: 'blue', label: 'Submitted' },
  under_review: { tone: 'blue', label: 'Under Review' },
  verified: { tone: 'emerald', label: 'Verified' },
  blocked: { tone: 'red', label: 'Blocked' },
  in_stock: { tone: 'emerald', label: 'In Stock' },
  low_stock: { tone: 'amber', label: 'Low Stock' },
  out_of_stock: { tone: 'red', label: 'Out of Stock' },
  sent: { tone: 'blue', label: 'Sent' },
  received: { tone: 'teal', label: 'Received' },
  partial: { tone: 'amber', label: 'Partial' },
  paid: { tone: 'emerald', label: 'Paid' },
};

export const PRIORITY = {
  urgent: { tone: 'red', label: 'Urgent' },
  high: { tone: 'orange', label: 'High' },
  medium: { tone: 'amber', label: 'Medium' },
  low: { tone: 'slate', label: 'Low' },
};

export const statusMeta = (status) =>
  STATUS[status] || {
    tone: 'slate',
    label: String(status || '—')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };

/** PR workflow step index used by WorkflowTracker (0-based, see WORKFLOW_STEPS). */
export const WORKFLOW_STEPS = [
  { key: 'request', label: 'Request', sublabel: 'Submitted by dept.' },
  { key: 'approval', label: 'Approval', sublabel: 'Admin review' },
  { key: 'rfq', label: 'RFQ', sublabel: 'Vendors quote' },
  { key: 'work_order', label: 'Work Order', sublabel: 'Issued to vendor' },
  { key: 'dispatch', label: 'Dispatch', sublabel: 'Vendor ships' },
  { key: 'gate', label: 'Gate Entry', sublabel: 'Verified at gate' },
  { key: 'documents', label: 'Documents', sublabel: 'Signed & scanned' },
  { key: 'bill', label: 'Bill Released', sublabel: 'Accounts approve' },
];

export const PR_WORKFLOW_STEP = {
  pending: 0,
  approved: 1,
  rfq_sent: 2,
  quotation_received: 2,
  quotation_approved: 3,
  dispatched: 4,
  gate_entry: 5,
  grn_created: 6,
  bill_released: 7,
  rejected: 0,
};
