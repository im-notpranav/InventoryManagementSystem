// Goods review: after the gate matches a delivery, the requesting faculty member or
// the HOD (whoever is first) records how many of each item are accepted. Accepted
// stock goes straight into inventory; the bill moves to the accountant.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageCheck, ClipboardCheck, History, Inbox, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import { ShipmentCard, ErrorNote, DeptBadge } from '../../components/order/OrderParts';
import { PageHeader, StatCard, DataTable, StatusBadge, Button, Modal, Field, Input, Select, Textarea, Tabs, useToast } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtINR, dataOf, errMsg } from '../../lib/utils';

const WARRANTY_MONTHS = [6, 12, 24, 36, 60];
const serialList = (raw) => [...new Set(String(raw || '').split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean))];

const itemsText = (s) => (s.items || []).map((i) => `${i.request_item?.product?.name} ×${i.qty_shipped}`).join(', ');
const DONE = ['reviewed', 'rejected', 'bill_approved', 'paid'];

export default function GoodsReview() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const openId = Number(params.get('id')) || null;

  const load = async () => {
    setLoading(true);
    try {
      setRows(dataOf(await api.get('/shipments', { params: { status: ['received', ...DONE].join(',') } })));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const pending = useMemo(() => rows.filter((s) => s.status === 'received'), [rows]);
  const done = useMemo(() => rows.filter((s) => DONE.includes(s.status)), [rows]);
  const reviewing = pending.find((s) => s.shipment_id === openId) || null;

  const open = (s) => setParams((p) => { p.set('id', s.shipment_id); return p; });
  const close = () => setParams((p) => { p.delete('id'); return p; });

  const columns = [
    { key: 'shipment_number', header: 'Delivery', render: (s) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{s.shipment_number}</span> },
    { key: 'vendor', header: 'Vendor', sortValue: (s) => s.wo?.vendor?.vendor_name, render: (s) => <span className="text-slate-700">{s.wo?.vendor?.vendor_name}</span> },
    { key: 'items', header: 'Items', sortValue: itemsText, render: (s) => <span className="text-slate-700 cell-text block">{itemsText(s)}</span> },
    { key: 'request', header: 'Request', hideBelow: 'lg', render: (s) => (
      <div><p className="font-mono text-xs text-slate-600">{s.wo?.request?.pr_number}</p><p className="text-[11px] text-slate-400">{s.wo?.request?.user?.name}</p><DeptBadge department={s.wo?.request?.user?.department} className="mt-0.5" /></div>
    ) },
    tab === 'pending'
      ? { key: 'received_at', header: 'Arrived', hideBelow: 'md', sortValue: (s) => new Date(s.received_at || 0).getTime(), render: (s) => <span className="text-xs text-slate-600">{fmtDateTime(s.received_at)}</span> }
      : { key: 'reviewed_at', header: 'Reviewed', hideBelow: 'md', sortValue: (s) => new Date(s.reviewed_at || 0).getTime(), render: (s) => <span className="text-xs text-slate-600">{fmtDate(s.reviewed_at)}{s.reviewer?.name ? ` · ${s.reviewer.name}` : ''}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    ...(tab === 'pending' ? [{ key: 'act', header: '', align: 'right', render: (s) => <Button size="xs" variant="success" icon={ClipboardCheck} onClick={(e) => { e.stopPropagation(); open(s); }}>Review</Button> }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Review"
        subtitle="Check deliveries that passed the gate. Accepted items go into stock and the bill goes to accounts."
        icon={PackageCheck}
      />

      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <StatCard index={0} loading={loading} label="Waiting for review" value={pending.length} icon={ClipboardCheck} tone="teal" active={tab === 'pending'} onClick={() => setTab('pending')} />
        <StatCard index={1} loading={loading} label="Reviewed" value={done.length} icon={History} tone="slate" active={tab === 'done'} onClick={() => setTab('done')} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'pending', label: `To review (${pending.length})` }, { key: 'done', label: `Reviewed (${done.length})` }]} />

      <DataTable
        key={tab}
        columns={columns}
        rows={tab === 'pending' ? pending : done}
        rowKey="shipment_id"
        loading={loading}
        onRowClick={tab === 'pending' ? open : undefined}
        expandable={tab === 'done' ? (s) => <ShipmentCard shipment={s} /> : undefined}
        emptyIcon={Inbox}
        emptyTitle={tab === 'pending' ? 'Nothing to review' : 'No reviewed deliveries yet'}
        emptyDescription={tab === 'pending' ? 'Deliveries appear here once the gate has matched them.' : undefined}
      />

      <ReviewModal shipment={reviewing} open={!!reviewing} onClose={close} onDone={() => { close(); load(); }} />
    </div>
  );
}

function ReviewModal({ shipment: s, open, onClose, onDone }) {
  const toast = useToast();
  const [accepted, setAccepted] = useState({});
  const [warranty, setWarranty] = useState({}); // { [shipment_item_id]: { months, serials } }
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s) {
      setAccepted(Object.fromEntries(s.items.map((i) => [i.shipment_item_id, String(i.qty_shipped)])));
      setWarranty({});
      setRemarks('');
      setError('');
    }
  }, [s?.shipment_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return null;

  const lines = s.items.map((i) => {
    const raw = accepted[i.shipment_item_id];
    const n = raw === '' || raw == null ? NaN : Number(raw);
    const valid = Number.isInteger(n) && n >= 0 && n <= i.qty_shipped;
    const w = warranty[i.shipment_item_id] || {};
    return { i, n, valid, rejected: valid ? i.qty_shipped - n : 0, months: Number(w.months) || 0, serials: serialList(w.serials) };
  });
  const setW = (id, patch) => setWarranty((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  const anyRejected = lines.some((l) => l.rejected > 0);
  const billable = lines.reduce((sum, l) => sum + (l.valid ? l.n * Number(l.i.unit_price) : 0), 0);

  const submit = async () => {
    setError('');
    const bad = lines.find((l) => !l.valid);
    if (bad) return setError(`${bad.i.request_item?.product?.name}: enter a number from 0 to ${bad.i.qty_shipped}.`);
    if (anyRejected && !remarks.trim()) return setError('Say what was wrong with the rejected items. The vendor sees this.');
    const tooMany = lines.find((l) => l.months && l.serials.length > l.n);
    if (tooMany) return setError(`${tooMany.i.request_item?.product?.name}: ${tooMany.serials.length} serial numbers but only ${tooMany.n} accepted.`);
    setSaving(true);
    try {
      const res = await api.post(`/shipments/${s.shipment_id}/review`, {
        items: lines.map((l) => ({ shipment_item_id: l.i.shipment_item_id, qty_accepted: l.n })),
        remarks: remarks.trim() || undefined,
        warranties: lines
          .filter((l) => l.months && l.n > 0)
          .map((l) => ({ shipment_item_id: l.i.shipment_item_id, months: l.months, serials: l.serials })),
      });
      toast.success(res.data?.message || 'Review saved', { title: s.shipment_number });
      onDone();
    } catch (e) {
      setError(errMsg(e, 'Could not save the review'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={ClipboardCheck}
      title={`Review ${s.shipment_number}`}
      description={`${s.wo?.vendor?.vendor_name} · invoice ${s.invoice_number}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={anyRejected ? 'warning' : 'success'} loading={saving} icon={anyRejected ? XCircle : CheckCircle2} onClick={submit}>
            {anyRejected ? 'Save partial acceptance' : 'Accept all'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {lines.map(({ i, n, valid, rejected, months, serials }) => (
            <div key={i.shipment_item_id} className="px-3.5 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{i.request_item?.product?.name}</p>
                  <p className="text-xs text-slate-500">
                    {i.qty_shipped} delivered · {fmtINR(i.unit_price, { decimals: true })} each
                    {rejected > 0 && <span className="text-red-600"> · {rejected} rejected</span>}
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <Field label="Accepted">
                    <Input
                      type="number"
                      min="0"
                      max={i.qty_shipped}
                      value={accepted[i.shipment_item_id] ?? ''}
                      error={!valid}
                      onChange={(e) => setAccepted((a) => ({ ...a, [i.shipment_item_id]: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>
              {valid && n > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={months ? 'w-4 h-4 text-emerald-600' : 'w-4 h-4 text-slate-400'} />
                    <span className="text-xs font-medium text-slate-600">Warranty</span>
                    <Select
                      value={months || ''}
                      onChange={(e) => setW(i.shipment_item_id, { months: e.target.value })}
                      className="!py-1 !text-xs !w-auto ml-auto"
                      aria-label={`Warranty for ${i.request_item?.product?.name}`}
                    >
                      <option value="">None</option>
                      {WARRANTY_MONTHS.map((m) => <option key={m} value={m}>{m % 12 ? `${m} months` : `${m / 12} year${m > 12 ? 's' : ''}`}</option>)}
                    </Select>
                  </div>
                  {months > 0 && (
                    <Textarea
                      rows={2}
                      value={warranty[i.shipment_item_id]?.serials || ''}
                      onChange={(e) => setW(i.shipment_item_id, { serials: e.target.value })}
                      placeholder={`Serial numbers, one per line (optional, up to ${n})`}
                      error={serials.length > n}
                      className="!min-h-[56px] font-mono text-xs"
                    />
                  )}
                  {months > 0 && (
                    <p className="text-[11px] text-slate-500">
                      Tracked from today. The HOD is reminded before it ends{serials.length ? ` · ${serials.length} serial${serials.length > 1 ? 's' : ''}` : ''}.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <Field
          label={anyRejected ? 'What was wrong?' : 'Remarks'}
          required={anyRejected}
          hint={anyRejected ? 'Rejected items stay open on the work order. The vendor is asked to send replacements.' : 'Optional'}
        >
          <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={anyRejected ? 'e.g. 2 monitors arrived with cracked screens' : ''} />
        </Field>
        <div className="rounded-xl px-3.5 py-2.5 text-sm flex justify-between bg-slate-50 border border-slate-200">
          <span className="text-slate-600">Amount sent to billing</span>
          <span className="font-semibold tabular text-slate-900">{fmtINR(billable, { decimals: true })}</span>
        </div>
      </div>
    </Modal>
  );
}
