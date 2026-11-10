// Small parsers and access rules shared by the warranty and subscription routes.
const { normalizeDepartment } = require('../../utils/departments');
const { sameDept } = require('../../utils/orderCycle');

const parseId = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Date inputs send "YYYY-MM-DD". Parse as local midnight so the stored day
// does not shift by the timezone offset.
const parseDate = (v) => {
  if (v == null || v === '') return null;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const text = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s || null;
};

/** Department a new record belongs to: an HOD's own, or the one a super admin picked. */
const departmentFor = (user, requested) => user.department || normalizeDepartment(requested);

/** HODs edit their own department's records; a super admin edits all. */
const canEdit = (user, department) => user.role === 'Admin' && (!user.department || sameDept(user.department, department));

/** Renewal note appended to the record's notes, so earlier notes are kept. */
const appendNote = (current, note, label) => {
  const add = text(note);
  if (!add) return undefined;
  const stamp = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return [current, `${label} ${stamp}: ${add}`].filter(Boolean).join('\n');
};

module.exports = { parseId, parseDate, text, departmentFor, canEdit, appendNote };
