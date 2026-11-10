// Billing, one bill per reviewed delivery.
//   Accountant: To approve → approve → To pay → record payment → Paid
//   HOD: read-only view of their department's bills.
// Each bill shows everything needed to approve it: quote, work order, invoice,
// gate check and the accepted quantities (billable = accepted × quoted unit price).
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, BadgeCheck, Wallet, CheckCircle2, IndianRupee, Inbox } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { DocLink, GateHistory, SectionTitle, ErrorNote, DeptBadge } from '../../components/order/OrderParts';
import { PageHeader, StatCard, DataTable, Button, Modal, Field, Input, Select, SearchInput, KV, Tabs, useToast, ErrorState } from '../../components/ui';
import { fmtINR, fmtDate, dataOf, errMsg } from '../../lib/utils';

const MODES = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash', 'Other'];
const TABS = [
  { key: 'reviewed', label: 'To approve' },
  { key: 'bill_approved', label: 'To pay' },
  { key: 'paid', label: 'Paid' },
];

export default function Billing() {
  const { isAccountant } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(null);
  const tab = TABS.some((t) => t.key === params.get('status')) ? params.get('status') : 'reviewed';
  const setTab = (k) => setParams((p) => { p.set('status', k); return p; }, { replace: true });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBills(dataOf(await api.get('/billing')));
    } catch (e) {
      setError(errMsg(e, 'Failed to load bills'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const byStatus = useMemo(() => {
    const g = { reviewed: [], bill_approved: [], paid: [] };
    bills.forEach((b) => g[b.status]?.push(b));
    return g;
  }, [bills]);
  const sum = (list) => list.reduce((s, b) => s + Number(b.billable_amount || 0), 0);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (byStatus[tab] || []).filter((b) => !q || [b.shipment_number, b.invoice_number, b.wo?.wo_number, b.wo?.vendor?.vendor_name, b.wo?.request?.pr_number, b.payment_ref]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [byStatus, tab, search]);

  const approve = async (b) => {
    setBusy(b.shipment_id);
    try {
      await api.post(`/billing/${b.shipment_id}/approve`);
      toast.success(`${fmtINR(b.billable_amount)} to ${b.wo?.vendor?.vendor_name}`, { title: 'Bill approved' });
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Could not approve the bill'));
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    { key: 'shipment_number', header: 'Delivery', render: (b) => (
      <div><p className="font-mono text-[12.5px] font-semibold text-brand-700">{b.shipment_number}</p><p className="text-[11px] text-slate-400">Invoice {b.invoice_number}</p></div>
    ) },
    { key: 'vendor', header: 'Vendor', sortValue: (b) => b.wo?.vendor?.vendor_name, render: (b) => <span className="text-slate-700">{b.wo?.vendor?.vendor_name}</span> },
    { key: 'dept', header: 'Department', hideBelow: 'lg', render: (b) => <DeptBadge department={b.wo?.request?.user?.department} /> },
    { key: 'invoice_amount', header: 'Invoiced', align: 'right', hideBelow: 'md', sortValue: (b) => Number(b.invoice_amount), render: (b) => <span className="tabular text-slate-500">{fmtINR(b.invoice_amount)}</span> },
    { key: 'billable_amount', header: 'To pay', align: 'right', sortValue: (b) => Number(b.billable_amount), render: (b) => <span className="tabular font-semibold text-slate-900">{fmtINR(b.billable_amount)}</span> },
    tab === 'paid'
      ? { key: 'payment', header: 'Paid', hideBelow: 'md', sortValue: (b) => new Date(b.payment_date || 0).getTime(), render: (b) => <span className="text-xs text-slate-600">{fmtDate(b.payment_date)} · {b.payment_mode}</span> }
      : { key: 'reviewed_at', header: 'Reviewed', hideBelow: 'md', sortValue: (b) => new Date(b.reviewed_at || 0).getTime(), render: (b) => <span className="text-xs text-slate-600">{fmtDate(b.reviewed_at)}</span> },
    ...(isAccountant && tab !== 'paid' ? [{
      key: 'act', header: '', align: 'right', render: (b) => (tab === 'reviewed'
        ? <Button size="xs" variant="success" icon={BadgeCheck} loading={busy === b.shipment_id} onClick={(e) => { e.stopPropagation(); approve(b); }}>Approve</Button>
        : <Button size="xs" icon={Wallet} onClick={(e) => { e.stopPropagation(); setPaying(b); }}>Record payment</Button>),
    }] : []),
  ];

  const expand = (b) => {
    const differs = Number(b.invoice_amount) !== Number(b.billable_amount);
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KV label="Work order" value={b.wo?.wo_number} mono />
          <KV label="Request" value={b.wo?.request?.pr_number} mono />
          <KV label="Reviewed by" value={b.reviewer?.name} />
          <KV label="Quoted total (whole order)" value={fmtINR(b.wo?.submission?.total_price)} />
        </div>
        <div>
          <SectionTitle>Accepted items</SectionTitle>
          <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-surface">
            {(b.items || []).map((i) => (
              <li key={i.shipment_item_id} className="flex justify-between gap-3 px-3.5 py-2 text-sm">
                <span className="text-slate-800">{i.request_item?.product?.name}</span>
                <span className="tabular text-slate-700">
                  {i.qty_accepted ?? 0} of {i.qty_shipped} × {fmtINR(i.unit_price, { decimals: true })}
                  <span className="ml-2 font-semibold text-slate-900">{fmtINR((i.qty_accepted || 0) * Number(i.unit_price), { decimals: true })}</span>
                </span>
              </li>
            ))}
          </ul>
          {differs && (
            <p className="text-xs text-amber-700 mt-1.5">
              Invoice says {fmtINR(b.invoice_amount)}. Pay {fmtINR(b.billable_amount)}: only accepted items at the quoted price.
            </p>
          )}
          {b.review_remarks && <p className="text-xs text-slate-500 mt-1.5">Review note: {b.review_remarks}</p>}
        </div>
        <div>
          <SectionTitle>Gate</SectionTitle>
          <GateHistory checks={b.gate_checks} />
        </div>
        {b.status === 'paid' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KV label="Paid on" value={fmtDate(b.payment_date)} />
            <KV label="Mode" value={b.payment_mode} />
            <KV label="Reference" value={b.payment_ref || '—'} mono />
            <KV label="Recorded by" value={b.payer?.name} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <DocLink url={b.invoice_url} label="Invoice" />
          <DocLink url={b.wo?.submission?.quotation_file_url} label="Quotation" />
          <DocLink url={b.wo?.request?.letter_url} label="Principal's letter" />
        </div>
      </div>
    );
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle={isAccountant
          ? 'Approve bills for accepted goods, then record the payment.'
          : 'Bills for your department. The accountant approves and pays them.'}
        icon={Receipt}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} loading={loading} label="To approve" value={byStatus.reviewed.length} hint={fmtINR(sum(byStatus.reviewed))} icon={BadgeCheck} tone="amber" active={tab === 'reviewed'} onClick={() => setTab('reviewed')} />
        <StatCard index={1} loading={loading} label="To pay" value={byStatus.bill_approved.length} hint={fmtINR(sum(byStatus.bill_approved))} icon={IndianRupee} tone="violet" active={tab === 'bill_approved'} onClick={() => setTab('bill_approved')} />
        <StatCard index={2} loading={loading} label="Paid" value={byStatus.paid.length} hint={fmtINR(sum(byStatus.paid))} icon={CheckCircle2} tone="emerald" active={tab === 'paid'} onClick={() => setTab('paid')} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, label: `${t.label} (${byStatus[t.key].length})` }))} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search delivery, invoice, vendor…" className="sm:w-72" />
      </div>

      <DataTable
        key={tab}
        columns={columns}
        rows={rows}
        rowKey="shipment_id"
        loading={loading}
        expandable={expand}
        emptyIcon={Inbox}
        emptyTitle={{ reviewed: 'No bills waiting for approval', bill_approved: 'Nothing to pay', paid: 'No payments yet' }[tab]}
        emptyDescription={tab === 'reviewed' ? 'Bills appear here after the goods are reviewed.' : undefined}
        footer={<span>{rows.length} bill{rows.length === 1 ? '' : 's'} · {fmtINR(sum(rows))} · click a row for documents</span>}
      />

      <PayModal bill={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />
    </div>
  );
}

function PayModal({ bill, onClose, onDone }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ payment_date: today, payment_mode: 'NEFT', payment_ref: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) { setForm({ payment_date: today, payment_mode: 'NEFT', payment_ref: '' }); setError(''); }
  }, [bill?.shipment_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsRef = form.payment_mode !== 'Cash';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (needsRef && !form.payment_ref.trim()) return setError('Enter the transaction or cheque reference.');
    setSaving(true);
    try {
      await api.post(`/billing/${bill.shipment_id}/pay`, { ...form, payment_ref: form.payment_ref.trim() });
      toast.success(`${fmtINR(bill.billable_amount)} to ${bill.wo?.vendor?.vendor_name}`, { title: 'Payment recorded' });
      onDone();
    } catch (err) {
      setError(errMsg(err, 'Could not record the payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!bill}
      onClose={onClose}
      size="md"
      icon={Wallet}
      title="Record payment"
      description={bill ? `${bill.shipment_number} · ${bill.wo?.vendor?.vendor_name} · ${fmtINR(bill.billable_amount)}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="pay-form" loading={saving} icon={CheckCircle2}>Mark paid</Button>
        </>
      }
    >
      <form id="pay-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid on" required><Input type="date" max={today} value={form.payment_date} onChange={set('payment_date')} /></Field>
          <Field label="Mode" required>
            <Select value={form.payment_mode} onChange={set('payment_mode')}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={form.payment_mode === 'Cheque' ? 'Cheque number' : 'Transaction reference'} required={needsRef} hint={needsRef ? undefined : 'Optional for cash'}>
          <Input value={form.payment_ref} onChange={set('payment_ref')} mono placeholder={form.payment_mode === 'UPI' ? 'UTR / UPI ref' : 'UTR / reference'} />
        </Field>
      </form>
    </Modal>
  );
}
