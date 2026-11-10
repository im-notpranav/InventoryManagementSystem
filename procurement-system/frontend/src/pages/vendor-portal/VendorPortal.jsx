// Vendor portal (v3). One list of things to do, in order:
//   RFQ → quote (unit price per item + delivery date + PDF)
//   Work order → invoice a delivery (qty per item + invoice PDF)
//   Invoiced → dispatch details (vehicle, arrival, packages) → gate pass (QR + code)
//   Reviewed → billing → paid
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCircle2, ClipboardList, FileSearch, Truck, Receipt, LayoutDashboard, ArrowRight, QrCode, Printer, Trash2,
  IndianRupee, ShieldAlert, Send,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import CountUp from '../../components/reactbits/CountUp/CountUp';
import { LedgerTable, ShipmentCard, DocLink, SectionTitle, ErrorNote } from '../../components/order/OrderParts';
import {
  StatCard, Card, Button, Modal, Field, Input, Textarea, FileDrop, Tabs, StatusBadge, Badge, EmptyState, KV, Stagger, StaggerItem,
  DataTable, useToast, useConfirm, ErrorState, PageSkeleton,
} from '../../components/ui';
import { fmtDate, fmtINR, dataOf, errMsg, cn } from '../../lib/utils';
import { useReducedMotion } from '../../hooks';

const TABS = [
  { key: 'overview', label: 'To do', icon: LayoutDashboard },
  { key: 'rfqs', label: 'RFQs & Quotes', icon: FileSearch },
  { key: 'orders', label: 'Work Orders', icon: ClipboardList },
  { key: 'payments', label: 'Payments', icon: Receipt },
];
const BILLING = ['reviewed', 'bill_approved', 'paid'];
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);
const rfqOpen = (r) => r.request?.status === 'rfq_sent' && !r.closed;
const itemsText = (items = []) => items.map((i) => `${i.product?.name} ×${i.quantity}`).join(', ');
const nameMap = (wo) => new Map((wo?.ledger || []).map((l) => [l.request_item_id, l.product?.name]));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function VendorPortal() {
  const { user, vendor_id } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const reduced = useReducedMotion();

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rfqs, setRfqs] = useState([]);
  const [wos, setWos] = useState([]);
  const [quoting, setQuoting] = useState(null); // rfq
  const [invoicing, setInvoicing] = useState(null); // wo
  const [dispatching, setDispatching] = useState(null); // shipment
  const [passFor, setPassFor] = useState(null); // shipment_id

  const load = async () => {
    if (!vendor_id) {
      setLoading(false);
      setError('Your account is not linked to a vendor record. Ask the HOD to fix this.');
      return;
    }
    setError('');
    try {
      const [r, w] = await Promise.all([api.get('/quotations/my-rfqs'), api.get('/work-orders')]);
      setRfqs(dataOf(r));
      setWos(dataOf(w));
    } catch (e) {
      setError(errMsg(e, 'Failed to load your portal'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shipments = useMemo(() => wos.flatMap((w) => (w.shipments || []).map((s) => ({ ...s, wo: w }))), [wos]);
  const toQuote = rfqs.filter((r) => rfqOpen(r) && !r.submission);
  const toInvoice = wos.filter((w) => w.status !== 'completed' && (w.ledger || []).some((l) => l.remaining > 0) && !(w.shipments || []).some((s) => s.status === 'invoiced'));
  const toDispatch = shipments.filter((s) => s.status === 'invoiced');
  const onTheWay = shipments.filter((s) => s.status === 'dispatched');
  const blocked = shipments.filter((s) => s.status === 'gate_blocked');
  const bills = shipments.filter((s) => BILLING.includes(s.status));
  const paidTotal = bills.filter((s) => s.status === 'paid').reduce((n, s) => n + Number(s.billable_amount || 0), 0);
  const actionCount = toQuote.length + toInvoice.length + toDispatch.length;

  const withdraw = async (s) => {
    if (!(await confirm({ title: `Withdraw invoice ${s.invoice_number}?`, message: 'Use this if the invoice was wrong. You can submit a new one.', confirmText: 'Withdraw' }))) return;
    try {
      await api.delete(`/shipments/${s.shipment_id}`);
      toast.success('Invoice withdrawn');
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Could not withdraw the invoice'));
    }
  };

  if (loading) return <PageSkeleton stats={4} table={false} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const shipmentActions = (s) => (
    <>
      {s.status === 'invoiced' && (
        <>
          <Button size="xs" variant="ghost" icon={Trash2} onClick={() => withdraw(s)} aria-label="Withdraw invoice" />
          <Button size="xs" variant="violet" icon={Truck} onClick={() => setDispatching(s)}>Dispatch</Button>
        </>
      )}
      {s.status === 'dispatched' && (
        <>
          <Button size="xs" variant="ghost" onClick={() => setDispatching(s)}>Edit</Button>
          <Button size="xs" icon={QrCode} onClick={() => setPassFor(s.shipment_id)}>Gate pass</Button>
        </>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <motion.section initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="surface p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-brand-200 bg-brand-50 text-brand-600 text-[11px] font-bold uppercase tracking-[0.06em]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Supplier portal
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-[-0.02em] text-slate-900 leading-none break-words">{user?.name || 'Vendor'}</h1>
            <p className="text-slate-500 mt-2 max-w-xl text-sm sm:text-base">
              {actionCount > 0 ? `${actionCount} thing${actionCount > 1 ? 's' : ''} need your action.` : 'Nothing pending. New RFQs and work orders appear here.'}
            </p>
          </div>
          <div className="flex gap-6 sm:gap-8">
            <Hero n={toQuote.length} label="RFQs to quote" />
            <Hero n={wos.filter((w) => w.status !== 'completed').length} label="Open orders" />
            <Hero n={onTheWay.length} label="On the way" />
          </div>
        </div>
      </motion.section>

      <Tabs id="vendor-tabs" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: t.key === 'overview' ? actionCount || undefined : t.key === 'rfqs' ? toQuote.length || undefined : undefined }))} />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-6">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard index={0} label="RFQs to quote" value={toQuote.length} icon={FileSearch} tone="amber" onClick={() => setTab('rfqs')} />
                <StatCard index={1} label="Deliveries to invoice" value={toInvoice.length} icon={Send} tone="blue" onClick={() => setTab('orders')} />
                <StatCard index={2} label="Blocked at gate" value={blocked.length} icon={ShieldAlert} tone={blocked.length ? 'red' : 'slate'} onClick={() => setTab('orders')} />
                <StatCard index={3} label="Paid to you" value={fmtINR(paidTotal)} icon={IndianRupee} tone="emerald" onClick={() => setTab('payments')} />
              </div>

              <Card title="Actions required" icon={Bell} description="Do these in order">
                <Stagger className="space-y-2.5">
                  {toQuote.map((r) => (
                    <ActionRow key={`q-${r.rfq_id}`} tone="amber" icon={FileSearch} title="Quotation needed"
                      sub={`${r.request?.pr_number} · ${itemsText(r.request?.items)}${r.request?.rfq_closes_at ? ` · closes ${fmtDate(r.request.rfq_closes_at)}` : ''}`}
                      cta="Quote" onClick={() => setQuoting(r)} />
                  ))}
                  {toInvoice.map((w) => (
                    <ActionRow key={`i-${w.wo_id}`} tone="blue" icon={ClipboardList} title={w.shipments?.length ? 'Send the remaining items' : 'New work order: invoice your delivery'}
                      sub={`${w.wo_number} · deliver by ${fmtDate(w.delivery_deadline)} · ${(w.ledger || []).filter((l) => l.remaining).map((l) => `${l.product?.name} ×${l.remaining}`).join(', ')}`}
                      cta="Invoice" onClick={() => setInvoicing(w)} />
                  ))}
                  {toDispatch.map((s) => (
                    <ActionRow key={`d-${s.shipment_id}`} tone="violet" icon={Truck} title="Add dispatch details"
                      sub={`${s.shipment_number} · invoice ${s.invoice_number}`} cta="Dispatch" onClick={() => setDispatching(s)} />
                  ))}
                  {blocked.map((s) => (
                    <div key={`b-${s.shipment_id}`} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3">
                      <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                      <div className="min-w-0"><p className="text-sm font-semibold text-red-800">{s.shipment_number} was stopped at the gate</p><p className="text-xs text-red-700/80">{s.gate_checks?.[0]?.reason || 'Mismatch'} · the HOD will contact you.</p></div>
                    </div>
                  ))}
                  {actionCount === 0 && !blocked.length && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div><p className="text-sm font-semibold text-emerald-800">You're all caught up</p><p className="text-xs text-emerald-700/80">No actions required right now.</p></div>
                    </div>
                  )}
                </Stagger>
              </Card>

              {onTheWay.length > 0 && (
                <Card title="On the way" icon={Truck} description="Give the gate pass to the driver">
                  <div className="space-y-2">
                    {onTheWay.map((s) => <ShipmentCard key={s.shipment_id} shipment={s} names={nameMap(s.wo)} actions={shipmentActions(s)} />)}
                  </div>
                </Card>
              )}
            </>
          )}

          {tab === 'rfqs' && (
            <DataTable
              rows={rfqs}
              rowKey="rfq_id"
              emptyIcon={FileSearch}
              emptyTitle="No RFQs yet"
              emptyDescription="When a department invites you to quote, it appears here."
              columns={[
                { key: 'pr', header: 'Request', render: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{r.request?.pr_number}</span> },
                { key: 'items', header: 'Items', render: (r) => <span className="text-slate-700 cell-text block">{itemsText(r.request?.items)}</span> },
                { key: 'closes', header: 'Closes', hideBelow: 'md', render: (r) => <span className="text-xs text-slate-600">{fmtDate(r.request?.rfq_closes_at)}</span> },
                { key: 'quote', header: 'Your quote', align: 'right', render: (r) => (r.submission ? <span className="tabular text-slate-900">{fmtINR(r.submission.total_price)}</span> : <span className="text-xs text-slate-400">—</span>) },
                { key: 'status', header: 'Status', render: (r) => (r.submission ? <StatusBadge status={r.submission.status} /> : rfqOpen(r) ? <Badge tone="amber" dot pulse>Open</Badge> : <Badge tone="slate">Closed</Badge>) },
                { key: 'act', header: '', align: 'right', render: (r) => (rfqOpen(r) && (!r.submission || r.submission.status === 'pending')
                  ? <Button size="xs" variant={r.submission ? 'secondary' : 'warning'} onClick={() => setQuoting(r)}>{r.submission ? 'Revise' : 'Quote'}</Button>
                  : null) },
              ]}
            />
          )}

          {tab === 'orders' && (
            wos.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No work orders yet" description="When your quotation is selected, the work order appears here." />
            ) : (
              <div className="space-y-4">
                {wos.map((w) => (
                  <Card
                    key={w.wo_id}
                    title={<span className="font-mono">{w.wo_number}</span>}
                    description={`${w.request?.pr_number} · ${fmtINR(w.agreed_price)} · deliver by ${fmtDate(w.delivery_deadline)}`}
                    icon={ClipboardList}
                    actions={
                      <div className="flex items-center gap-2">
                        <StatusBadge status={w.status} />
                        {toInvoice.includes(w) && <Button size="sm" icon={Send} onClick={() => setInvoicing(w)}>Invoice delivery</Button>}
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      {w.terms && <div><SectionTitle>Terms</SectionTitle><p className="text-sm text-slate-700 whitespace-pre-line">{w.terms}</p></div>}
                      <LedgerTable ledger={w.ledger} />
                      {(w.shipments || []).length > 0 && (
                        <div className="space-y-2">
                          <SectionTitle>Deliveries</SectionTitle>
                          {w.shipments.map((s) => <ShipmentCard key={s.shipment_id} shipment={s} names={nameMap(w)} actions={shipmentActions(s)} />)}
                        </div>
                      )}
                      <DocLink url={w.submission?.quotation_file_url} label="Your quotation" />
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {tab === 'payments' && (
            <DataTable
              rows={bills}
              rowKey="shipment_id"
              emptyIcon={Receipt}
              emptyTitle="No bills yet"
              emptyDescription="After the department accepts your goods, the bill appears here."
              footer={<span>Paid so far: {fmtINR(paidTotal)}</span>}
              columns={[
                { key: 'sn', header: 'Delivery', render: (s) => <span className="font-mono text-[12.5px] font-semibold text-slate-800">{s.shipment_number}</span> },
                { key: 'inv', header: 'Invoice', render: (s) => <span className="text-xs text-slate-600">{s.invoice_number}</span> },
                { key: 'amt', header: 'Invoiced', align: 'right', hideBelow: 'md', render: (s) => <span className="tabular text-slate-500">{fmtINR(s.invoice_amount)}</span> },
                { key: 'bill', header: 'Payable', align: 'right', render: (s) => <span className="tabular font-semibold text-slate-900">{fmtINR(s.billable_amount)}</span> },
                { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
                { key: 'paid', header: 'Payment', hideBelow: 'md', render: (s) => (s.status === 'paid' ? <span className="text-xs text-slate-600">{fmtDate(s.payment_date)} · {s.payment_mode}{s.payment_ref ? ` · ${s.payment_ref}` : ''}</span> : <span className="text-xs text-slate-400">—</span>) },
              ]}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <QuoteModal rfq={quoting} onClose={() => setQuoting(null)} onDone={() => { setQuoting(null); load(); }} />
      <InvoiceModal wo={invoicing} onClose={() => setInvoicing(null)} onDone={(s) => { setInvoicing(null); load(); if (s) setDispatching(s); }} />
      <DispatchModal shipment={dispatching} onClose={() => setDispatching(null)} onDone={(id) => { setDispatching(null); load(); setPassFor(id); }} />
      <GatePassModal shipmentId={passFor} onClose={() => setPassFor(null)} />
    </div>
  );
}

function Hero({ n, label }) {
  return (
    <div className="text-center sm:text-right">
      <p className="text-3xl font-bold tabular leading-none text-slate-900"><CountUp to={n} duration={1} /></p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mt-1.5">{label}</p>
    </div>
  );
}

function ActionRow({ tone, icon: Icon, title, sub, cta, onClick }) {
  const ring = { amber: 'border-amber-200 bg-amber-50/60', blue: 'border-blue-200 bg-blue-50/60', violet: 'border-violet-200 bg-violet-50/60' }[tone];
  const btn = { amber: 'warning', blue: 'primary', violet: 'violet' }[tone];
  const ic = { amber: 'text-amber-600', blue: 'text-blue-600', violet: 'text-violet-600' }[tone];
  return (
    <StaggerItem className={cn('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', ring)}>
      <span className={cn('w-9 h-9 rounded-lg bg-surface grid place-items-center shrink-0', ic)}><Icon className="w-4 h-4" /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="text-xs text-slate-500 truncate">{sub}</p></div>
      <Button size="sm" variant={btn} onClick={onClick}>{cta} <ArrowRight className="w-3.5 h-3.5" /></Button>
    </StaggerItem>
  );
}

// ── Quote: unit price per item + delivery date + PDF ────────
function QuoteModal({ rfq, onClose, onDone }) {
  const toast = useToast();
  const [prices, setPrices] = useState({});
  const [delivery, setDelivery] = useState(plusDays(7));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const items = rfq?.request?.items || [];
  const existing = rfq?.submission;

  useEffect(() => {
    if (!rfq) return;
    const prev = new Map((existing?.items || []).map((i) => [i.request_item_id, String(Number(i.unit_price))]));
    setPrices(Object.fromEntries(items.map((i) => [i.item_id, prev.get(i.item_id) || ''])));
    setDelivery(existing?.expected_delivery ? existing.expected_delivery.slice(0, 10) : plusDays(7));
    setNotes(existing?.notes || '');
    setFile(null);
    setError('');
  }, [rfq?.rfq_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = items.reduce((s, i) => s + (parseFloat(prices[i.item_id]) || 0) * i.quantity, 0);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (items.some((i) => !(parseFloat(prices[i.item_id]) > 0))) return setError('Enter a unit price for every item.');
    if (!delivery) return setError('Set the expected delivery date.');
    if (!file && !existing) return setError('Attach your quotation PDF.');
    const fd = new FormData();
    fd.append('request_id', rfq.request.request_id);
    fd.append('expected_delivery', delivery);
    fd.append('items', JSON.stringify(items.map((i) => ({ request_item_id: i.item_id, unit_price: parseFloat(prices[i.item_id]) }))));
    if (notes.trim()) fd.append('notes', notes.trim());
    if (file) fd.append('quotation_file', file);
    setSaving(true);
    try {
      const res = await api.post('/quotations/submit', fd);
      toast.success(res.data?.message || 'Quotation submitted', { title: rfq.request.pr_number });
      onDone();
    } catch (err) {
      setError(errMsg(err, 'Could not submit the quotation'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!rfq}
      onClose={onClose}
      size="lg"
      icon={FileSearch}
      title={existing ? 'Revise quotation' : 'Submit quotation'}
      description={rfq ? `${rfq.request?.pr_number}${rfq.request?.rfq_closes_at ? ` · closes ${fmtDate(rfq.request.rfq_closes_at)}` : ''}${rfq.request?.required_date ? ` · needed by ${fmtDate(rfq.request.required_date)}` : ''}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="quote-form" loading={saving} icon={Send}>{existing ? 'Update quote' : 'Submit quote'}</Button>
        </>
      }
    >
      <form id="quote-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {items.map((i) => (
            <div key={i.item_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{i.product?.name}</p>
                <p className="text-xs text-slate-500">{i.quantity} {i.product?.unit}{i.notes ? ` · ${i.notes}` : ''}</p>
              </div>
              <div className="w-36 shrink-0">
                <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Unit price ₹" value={prices[i.item_id] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [i.item_id]: e.target.value }))} />
              </div>
            </div>
          ))}
          <div className="flex justify-between px-3.5 py-2.5 bg-slate-50 text-sm">
            <span className="text-slate-600">Total</span>
            <span className="font-semibold tabular text-slate-900">{fmtINR(total, { decimals: true })}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Expected delivery" required><Input type="date" min={today()} value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
          <Field label="Quotation PDF" required={!existing} hint={existing && !file ? 'Leave empty to keep your earlier PDF' : undefined}>
            <FileDrop file={file} onChange={setFile} accept=".pdf" compact />
          </Field>
        </div>
        <Field label="Note" hint="Optional — warranty, brand, conditions">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

// ── Invoice a delivery: qty per item + invoice PDF ──────────
function InvoiceModal({ wo, onClose, onDone }) {
  const toast = useToast();
  const [qty, setQty] = useState({});
  const [number, setNumber] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const open = (wo?.ledger || []).filter((l) => l.remaining > 0);

  useEffect(() => {
    if (!wo) return;
    setQty(Object.fromEntries(open.map((l) => [l.request_item_id, String(l.remaining)])));
    setNumber('');
    setFile(null);
    setError('');
  }, [wo?.wo_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = open.reduce((s, l) => s + (parseInt(qty[l.request_item_id], 10) || 0) * Number(l.unit_price || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!number.trim()) return setError('Enter the invoice number.');
    if (!file) return setError('Attach the invoice PDF.');
    const over = open.find((l) => (parseInt(qty[l.request_item_id], 10) || 0) > l.remaining);
    if (over) return setError(`${over.product?.name}: at most ${over.remaining}.`);
    const lines = open.map((l) => ({ request_item_id: l.request_item_id, qty: parseInt(qty[l.request_item_id], 10) || 0 })).filter((l) => l.qty > 0);
    if (!lines.length) return setError('Enter the quantity you are sending.');
    const fd = new FormData();
    fd.append('wo_id', wo.wo_id);
    fd.append('invoice_number', number.trim());
    fd.append('items', JSON.stringify(lines));
    fd.append('invoice_file', file);
    setSaving(true);
    try {
      const res = await api.post('/shipments', fd);
      toast.success(res.data?.message || 'Invoice submitted', { title: wo.wo_number });
      onDone(dataOf(res, null));
    } catch (err) {
      setError(errMsg(err, 'Could not submit the invoice'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!wo}
      onClose={onClose}
      size="lg"
      icon={Receipt}
      title="Invoice a delivery"
      description={wo ? `${wo.wo_number} · partial deliveries are fine, one invoice per delivery` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="invoice-form" loading={saving} icon={Send}>Submit invoice</Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {open.map((l) => (
            <div key={l.request_item_id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{l.product?.name}</p>
                <p className="text-xs text-slate-500">{l.remaining} still to send · {fmtINR(l.unit_price, { decimals: true })} each</p>
              </div>
              <div className="w-24 shrink-0">
                <Input type="number" min="0" max={l.remaining} value={qty[l.request_item_id] ?? ''} onChange={(e) => setQty((q) => ({ ...q, [l.request_item_id]: e.target.value }))} />
              </div>
            </div>
          ))}
          <div className="flex justify-between px-3.5 py-2.5 bg-slate-50 text-sm">
            <span className="text-slate-600">Invoice amount (at quoted prices)</span>
            <span className="font-semibold tabular text-slate-900">{fmtINR(amount, { decimals: true })}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Invoice number" required><Input value={number} onChange={(e) => setNumber(e.target.value)} mono placeholder="e.g. INV/24-25/118" /></Field>
          <Field label="Invoice PDF" required><FileDrop file={file} onChange={setFile} accept=".pdf" compact /></Field>
        </div>
      </form>
    </Modal>
  );
}

// ── Dispatch: vehicle, arrival, packages ────────────────────
function DispatchModal({ shipment: s, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ vehicle_number: '', expected_arrival: plusDays(2), num_packages: '1' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!s) return;
    setForm({
      vehicle_number: s.vehicle_number || '',
      expected_arrival: s.expected_arrival ? s.expected_arrival.slice(0, 10) : plusDays(2),
      num_packages: s.num_packages ? String(s.num_packages) : '1',
    });
    setError('');
  }, [s?.shipment_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.vehicle_number.replace(/[^A-Za-z0-9]/g, '').length < 4) return setError('Enter the vehicle number.');
    if (!(parseInt(form.num_packages, 10) >= 1)) return setError('Number of packages must be at least 1.');
    setSaving(true);
    try {
      const res = await api.put(`/shipments/${s.shipment_id}/dispatch`, form);
      toast.success(res.data?.message || 'Dispatched', { title: s.shipment_number });
      onDone(s.shipment_id);
    } catch (err) {
      setError(errMsg(err, 'Could not save dispatch details'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!s}
      onClose={onClose}
      size="md"
      icon={Truck}
      title={s?.status === 'dispatched' ? 'Edit dispatch details' : 'Dispatch details'}
      description={s ? `${s.shipment_number} · invoice ${s.invoice_number}. The gate checks these.` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{s?.status === 'invoiced' ? 'Later' : 'Cancel'}</Button>
          <Button type="submit" form="dispatch-form" loading={saving} icon={QrCode}>Save & get gate pass</Button>
        </>
      }
    >
      <form id="dispatch-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Vehicle number" required><Input value={form.vehicle_number} onChange={set('vehicle_number')} mono placeholder="e.g. TS09AB1234" className="uppercase" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expected arrival" required><Input type="date" min={today()} value={form.expected_arrival} onChange={set('expected_arrival')} /></Field>
          <Field label="Packages" required><Input type="number" min="1" value={form.num_packages} onChange={set('num_packages')} /></Field>
        </div>
      </form>
    </Modal>
  );
}

// ── Gate pass: QR + 6-digit code for the driver ─────────────
function GatePassModal({ shipmentId, onClose }) {
  const [pass, setPass] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shipmentId) return;
    setPass(null);
    setError('');
    api.get(`/shipments/${shipmentId}/gate-pass`).then((r) => setPass(dataOf(r, null))).catch((e) => setError(errMsg(e, 'Could not load the gate pass')));
  }, [shipmentId]);

  const print = () => {
    const w = window.open('', '_blank', 'width=480,height=720');
    if (!w || !pass) return;
    const rows = pass.items.map((i) => `<tr><td>${esc(i.name)}</td><td style="text-align:right">${esc(i.qty)} ${esc(i.unit)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><title>Gate pass ${esc(pass.shipment_number)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}h1{font-size:18px;margin:0 0 4px}p{margin:2px 0;font-size:13px;color:#475569}
      .code{font:700 34px ui-monospace,monospace;letter-spacing:.3em;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
      td{border-top:1px solid #e2e8f0;padding:6px 0}.c{text-align:center}</style></head><body>
      <div class="c"><h1>Gate pass</h1><p>${esc(pass.vendor_name)} · ${esc(pass.shipment_number)}</p>
      <img src="${esc(pass.qr)}" width="240" height="240" alt="QR"/><div class="code">${esc(pass.gate_code)}</div></div>
      <p><b>Vehicle:</b> ${esc(pass.vehicle_number)} &nbsp; <b>Packages:</b> ${esc(pass.num_packages)} &nbsp; <b>Arrival:</b> ${esc(fmtDate(pass.expected_arrival))}</p>
      <p><b>Invoice:</b> ${esc(pass.invoice_number)} &nbsp; <b>Work order:</b> ${esc(pass.wo_number)}</p>
      <table>${rows}</table><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <Modal
      open={!!shipmentId}
      onClose={onClose}
      size="sm"
      icon={QrCode}
      title="Gate pass"
      description="Send this to the driver. The watchman scans the QR or types the code."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button icon={Printer} onClick={print} disabled={!pass}>Print</Button>
        </>
      }
    >
      <ErrorNote>{error}</ErrorNote>
      {!pass && !error && <div className="skeleton h-64 w-full rounded-xl" />}
      {pass && (
        <div className="space-y-4 text-center">
          <img src={pass.qr} alt={`Gate pass QR for ${pass.shipment_number}`} className="mx-auto w-56 h-56 rounded-xl border border-slate-200" />
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-slate-900">{pass.gate_code}</p>
          <div className="grid grid-cols-3 gap-2 text-left">
            <KV label="Vehicle" value={pass.vehicle_number} mono />
            <KV label="Packages" value={pass.num_packages} />
            <KV label="Arrival" value={fmtDate(pass.expected_arrival)} />
          </div>
          <ul className="text-left text-xs text-slate-600 space-y-0.5">
            {pass.items.map((i, n) => <li key={n} className="flex justify-between"><span>{i.name}</span><span className="tabular">{i.qty} {i.unit}</span></li>)}
          </ul>
        </div>
      )}
    </Modal>
  );
}
