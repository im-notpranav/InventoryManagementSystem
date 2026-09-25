/** Small shared helpers used across pages. */

export const cn = (...classes) => classes.flat().filter(Boolean).join(' ');

export const API_ORIGIN =
  (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/i, '')) ||
  'http://localhost:5000';

/** Resolve an uploaded-file path ("uploads/x.pdf" | "/uploads/x.pdf" | full URL) to a URL. */
export const fileUrl = (path) => {
  if (!path) return null;
  const p = String(path);
  if (p.startsWith('http')) return p;
  return `${API_ORIGIN}/${p.replace(/^\//, '')}`;
};

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrDec = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export const fmtINR = (value, { decimals = false } = {}) => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return (decimals ? inrDec : inr).format(Number(value));
};

export const fmtNumber = (value) =>
  value === null || value === undefined ? '—' : Number(value).toLocaleString('en-IN');

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

export const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
};

export const daysUntil = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

export const initials = (name) =>
  String(name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const titleCase = (s) =>
  String(s || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

/** Download rows as CSV. */
export const downloadCsv = (filename, header, rows) => {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/** Stable avatar hue from a string. */
export const hueFor = (str) => {
  let h = 0;
  for (const c of String(str || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

/** Extract the `data` array from an axios response, tolerating shapes. */
export const dataOf = (res, fallback = []) => res?.data?.data ?? res?.data ?? fallback;
