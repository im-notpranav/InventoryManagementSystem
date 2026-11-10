// Small shared pieces for the order cycle (request → quote → work order → shipment → billing).
import { FileText, ExternalLink, ShieldCheck, ShieldAlert, Truck, Package } from 'lucide-react';
import { Badge, StatusBadge, KV } from '../ui';
import { fileUrl, fmtDate, fmtDateTime, fmtINR, cn } from '../../lib/utils';

export function DocLink({ url, label }) {
  if (!url) return null;
  return (
    <a
      href={fileUrl(url)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
    >
      <FileText className="w-3.5 h-3.5" /> {label} <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

export function SectionTitle({ children, aside }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">{children}</p>
      {aside}
    </div>
  );
}

/** Request items: [{ item_id, quantity, notes, product: { name, unit } }] */
export function ItemsList({ items = [], prices }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-surface">
      {items.map((i) => (
        <li key={i.item_id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {i.product?.name}
            </p>
            {i.notes && <p className="text-xs text-slate-500 mt-0.5">{i.notes}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm tabular text-slate-900">
              {i.quantity} <span className="text-slate-400 text-xs">{i.product?.unit}</span>
            </p>
            {prices?.get(i.item_id) != null && (
              <p className="text-[11px] text-slate-500 tabular">{fmtINR(prices.get(i.item_id), { decimals: true })} each</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GateHistory({ checks = [] }) {
  if (!checks.length) return null;
  return (
    <ul className="space-y-1.5">
      {checks.map((c) => (
        <li key={c.check_id} className="flex items-start gap-2 text-xs">
          {c.result === 'match'
            ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            : <ShieldAlert className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />}
          <span className="text-slate-600">
            <span className={cn('font-semibold', c.result === 'match' ? 'text-emerald-700' : 'text-red-700')}>
              {c.result === 'match' ? 'Matched' : 'Mismatch'}
            </span>
            {c.reason ? ` — ${c.reason}` : ''} · {fmtDateTime(c.checked_at)}
            {c.checker?.name ? ` · ${c.checker.name}` : ''}
            {c.photo_url && <> · <a className="text-brand-600 hover:underline" href={fileUrl(c.photo_url)} target="_blank" rel="noreferrer">photo</a></>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One delivery. `names` maps request_item_id → product name (when shipment items
 * do not embed the product). `actions` renders on the right.
 */
export function ShipmentCard({ shipment: s, names, actions, children }) {
  const lineName = (it) => it.request_item?.product?.name || names?.get(it.request_item_id) || 'Item';
  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 grid place-items-center shrink-0"><Truck className="w-4 h-4" /></span>
          <div className="min-w-0">
            <p className="font-mono text-[12.5px] font-semibold text-slate-900 truncate">{s.shipment_number}</p>
            <p className="text-[11px] text-slate-500">Invoice {s.invoice_number} · {fmtINR(s.invoice_amount)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={s.status} />
          {actions}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label="Vehicle" value={s.vehicle_number || '—'} mono />
        <KV label="Expected" value={s.expected_arrival ? fmtDate(s.expected_arrival) : '—'} />
        <KV label="Packages" value={s.num_packages ?? '—'} />
        <KV label="Billable" value={s.billable_amount != null ? fmtINR(s.billable_amount) : '—'} />
      </div>
      <ul className="text-xs text-slate-600 space-y-0.5">
        {(s.items || []).map((it) => (
          <li key={it.shipment_item_id} className="flex justify-between gap-3">
            <span>{lineName(it)}</span>
            <span className="tabular">
              {it.qty_shipped} shipped
              {it.qty_accepted != null && (
                <>
                  {' · '}<span className="text-emerald-700">{it.qty_accepted} accepted</span>
                  {it.qty_shipped - it.qty_accepted > 0 && <span className="text-red-600"> · {it.qty_shipped - it.qty_accepted} rejected</span>}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {s.review_remarks && <p className="text-xs text-slate-500">Review: {s.review_remarks}</p>}
      <GateHistory checks={s.gate_checks} />
      <div className="flex flex-wrap gap-2">
        <DocLink url={s.invoice_url} label="Invoice" />
      </div>
      {children}
    </div>
  );
}

/** Work-order quantity ledger: [{ request_item_id, product, ordered, accepted, in_flight, remaining, unit_price }] */
export function LedgerTable({ ledger = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="text-left font-semibold px-3 py-2">Item</th>
            <th className="text-right font-semibold px-3 py-2">Ordered</th>
            <th className="text-right font-semibold px-3 py-2">Accepted</th>
            <th className="text-right font-semibold px-3 py-2">In transit</th>
            <th className="text-right font-semibold px-3 py-2">Remaining</th>
            <th className="text-right font-semibold px-3 py-2">Unit price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ledger.map((l) => (
            <tr key={l.request_item_id}>
              <td className="px-3 py-2 text-slate-800">{l.product?.name} <span className="text-xs text-slate-400">{l.product?.unit}</span></td>
              <td className="px-3 py-2 text-right tabular">{l.ordered}</td>
              <td className="px-3 py-2 text-right tabular text-emerald-700">{l.accepted}</td>
              <td className="px-3 py-2 text-right tabular text-orange-600">{l.in_flight}</td>
              <td className={cn('px-3 py-2 text-right tabular font-semibold', l.remaining ? 'text-slate-900' : 'text-slate-400')}>{l.remaining}</td>
              <td className="px-3 py-2 text-right tabular text-slate-600">{l.unit_price != null ? fmtINR(l.unit_price, { decimals: true }) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Department chip shown next to requests, deliveries, bills and users. */
export function DeptBadge({ department, className }) {
  if (!department) return null;
  return <Badge tone="indigo" size="xs" className={className}>{department}</Badge>;
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3.5 py-2.5 text-sm">{children}</div>;
}
