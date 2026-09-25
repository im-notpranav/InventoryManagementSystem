import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCircle2, ClipboardList, DoorOpen, FileCheck, FileSearch, Truck, Upload, Store, Clock, PackageCheck, Sparkles, LayoutDashboard,
  AlertTriangle, ArrowRight, FileText, ExternalLink, CalendarClock, IndianRupee, Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import GradientText from '../../components/reactbits/GradientText/GradientText';
import ShinyText from '../../components/reactbits/ShinyText/ShinyText';
import CountUp from '../../components/reactbits/CountUp/CountUp';
import { StatCard, Card, Button, Modal, Field, Input, Textarea, FileDrop, Tabs, FilterChips, StatusBadge, Badge, EmptyState, Progress, KV, Stagger, StaggerItem, useToast, useConfirm, ErrorState, PageSkeleton } from '../../components/ui';
import { fmtDate, fmtDateTime, fmtINR, fileUrl, dataOf, errMsg, daysUntil, timeAgo, cn } from '../../lib/utils';
import { useReducedMotion } from '../../hooks';

const TABS = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'quotations', label: 'RFQs & Quotes', icon: FileSearch },
  { key: 'work-orders', label: 'Work Orders', icon: ClipboardList },
  { key: 'delivery', label: 'Deliveries', icon: Truck },
];

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function VendorPortal() {
  const { user, vendor_id } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const reduced = useReducedMotion();

  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rfqData, setRfqData] = useState({ rfqs: [], submissions: [] });
  const [workOrders, setWorkOrders] = useState([]);
  const [quoteFilter, setQuoteFilter] = useState('all');
  const [woFilter, setWoFilter] = useState('all');
  const [quoteModal, setQuoteModal] = useState(null); // rfq
  const [dispatchModal, setDispatchModal] = useState(null); // wo
  const [uploading, setUploading] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ quoted_price: '', validity_days: '30', notes: '', quotation_file: null, proforma_file: null });
  const [dispatchForm, setDispatchForm] = useState({ tax_invoice_number: '', tax_invoice: null, expected_delivery: plusDays(3) });

  const load = async () => {
    if (!vendor_id) {
      setLoading(false);
      setError('Your account is not linked to a vendor record. Ask the administrator to fix this.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [r, w] = await Promise.all([api.get(`/quotations/vendor/${vendor_id}`), api.get(`/work-orders/vendor/${vendor_id}`)]);
      setRfqData(dataOf(r, { rfqs: [], submissions: [] }) || { rfqs: [], submissions: [] });
      setWorkOrders(dataOf(w));
    } catch (e) {
      setError(errMsg(e, 'Failed to load vendor portal data'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [vendor_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const rfqs = useMemo(() => {
    // The API can return one RFQ row per invite; collapse to one card per request, preferring rows with a submission.
    const byReq = new Map();
    (rfqData.rfqs || []).forEach((r) => {
      const key = r.request_id ?? r.rfq_id;
      const prev = byReq.get(key);
      if (!prev || (!prev.submission && r.submission)) byReq.set(key, r);
    });
    return [...byReq.values()];
  }, [rfqData.rfqs]);
  const pendingRfqs = rfqs.filter((r) => r.status === 'pending' && !r.submission);
  const issued = workOrders.filter((w) => w.status === 'issued');
  const acknowledged = workOrders.filter((w) => w.status === 'acknowledged');
  const inTransit = workOrders.filter((w) => w.status === 'dispatched');
  const delivered = workOrders.filter((w) => w.gate_entry?.invoice_verified);
  const wonValue = workOrders.reduce((a, w) => a + Number(w.agreed_price || 0), 0);
  const actionCount = pendingRfqs.length + issued.length + acknowledged.length;

  const quoteCounts = useMemo(() => {
    const c = { all: rfqs.length, pending: 0, submitted: 0, approved: 0, rejected: 0 };
    rfqs.forEach((r) => {
      if (r.submission?.status === 'approved') c.approved += 1;
      else if (r.submission?.status === 'rejected') c.rejected += 1;
      else if (r.submission) c.submitted += 1;
      else c.pending += 1;
    });
    return c;
  }, [rfqs]);

  const filteredRfqs = useMemo(() => {
    if (quoteFilter === 'pending') return rfqs.filter((r) => !r.submission && r.status === 'pending');
    if (quoteFilter === 'submitted') return rfqs.filter((r) => r.submission && !['approved', 'rejected'].includes(r.submission.status));
    if (quoteFilter === 'approved') return rfqs.filter((r) => r.submission?.status === 'approved');
    if (quoteFilter === 'rejected') return rfqs.filter((r) => r.submission?.status === 'rejected');
    return rfqs;
  }, [rfqs, quoteFilter]);

  const filteredWos = useMemo(() => (woFilter === 'all' ? workOrders : workOrders.filter((w) => w.status === woFilter)), [workOrders, woFilter]);

  const activity = useMemo(() => {
    const ev = [];
    rfqs.forEach((r) => {
      const ref = r.request?.pr_number || `PR-${r.request_id}`;
      ev.push({ at: r.sent_at, tone: 'amber', icon: FileSearch, text: `RFQ received · ${r.request?.product?.name || 'item'} (${ref})` });
      if (r.submission?.submitted_at) ev.push({ at: r.submission.submitted_at, tone: 'blue', icon: Upload, text: `Quotation submitted for ${ref}` });
      if (r.submission?.status === 'approved') ev.push({ at: r.submission.reviewed_at, tone: 'emerald', icon: CheckCircle2, text: `Quotation approved for ${ref}` });
      if (r.submission?.status === 'rejected') ev.push({ at: r.submission.reviewed_at, tone: 'red', icon: AlertTriangle, text: `Quotation not selected for ${ref}` });
    });
    workOrders.forEach((w) => {
      ev.push({ at: w.created_at, tone: 'violet', icon: ClipboardList, text: `Work order issued · ${w.wo_number}` });
      if (w.acknowledged_at) ev.push({ at: w.acknowledged_at, tone: 'blue', icon: CheckCircle2, text: `Acknowledged ${w.wo_number}` });
      if (w.dispatched_at) ev.push({ at: w.dispatched_at, tone: 'violet', icon: Truck, text: `Dispatched ${w.wo_number}` });
      if (w.gate_entry?.invoice_verified) ev.push({ at: w.gate_entry.entry_time, tone: 'emerald', icon: DoorOpen, text: `Delivery verified at gate · ${w.wo_number}` });
    });
    return ev.filter((e) => e.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  }, [rfqs, workOrders]);

  /* ─── actions ─── */
  const openQuote = (rfq) => {
    setQuoteForm({ quoted_price: '', validity_days: '30', notes: '', quotation_file: null, proforma_file: null });
    setQuoteModal(rfq);
  };
  const openDispatch = (wo) => {
    setDispatchForm({ tax_invoice_number: '', tax_invoice: null, expected_delivery: plusDays(3) });
    setDispatchModal(wo);
  };

  const submitQuotation = async () => {
    if (!quoteModal) return;
    if (!quoteForm.quotation_file || !quoteForm.proforma_file || Number(quoteForm.quoted_price) <= 0) return toast.error('Attach both PDFs and enter a valid price');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('quotation_file', quoteForm.quotation_file);
      fd.append('proforma_file', quoteForm.proforma_file);
      fd.append('request_id', quoteModal.request_id);
      fd.append('vendor_id', vendor_id);
      fd.append('quoted_price', quoteForm.quoted_price);
      fd.append('quoted_quantity', quoteModal.request?.quantity || 1);
      fd.append('validity_days', quoteForm.validity_days || '');
      fd.append('notes', quoteForm.notes || '');
      await api.post('/quotations/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setQuoteModal(null);
      toast.success('Quotation submitted — the admin team will review it', { title: 'Submitted' });
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to submit quotation'));
    } finally {
      setUploading(false);
    }
  };

  const acknowledge = async (wo) => {
    const ok = await confirm({ title: `Acknowledge ${wo.wo_number}?`, message: 'This confirms you have received the work order and accept its terms.', confirmText: 'Acknowledge' });
    if (!ok) return;
    try {
      await api.post(`/work-orders/${wo.wo_id}/acknowledge`);
      toast.success(`${wo.wo_number} acknowledged`);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to acknowledge'));
    }
  };

  const canDispatch = dispatchForm.tax_invoice_number.trim() && dispatchForm.tax_invoice && dispatchForm.expected_delivery;
  const dispatch = async () => {
    if (!dispatchModal || !canDispatch) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('tax_invoice_number', dispatchForm.tax_invoice_number.trim());
      fd.append('tax_invoice', dispatchForm.tax_invoice);
      fd.append('expected_delivery', dispatchForm.expected_delivery);
      await api.post(`/work-orders/${dispatchModal.wo_id}/dispatch`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDispatchModal(null);
      toast.success('Marked as dispatched — Security will verify the invoice number at the gate', { title: 'Dispatched' });
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to dispatch'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <PageSkeleton stats={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8" style={{ background: 'linear-gradient(135deg, #0b1324 0%, #1e3a5f 55%, #2e75b6 100%)' }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs backdrop-blur">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <ShinyText text="Approved supplier partner" speed={4} color="#dbeafe" shineColor="#fff" className="font-medium" />
            </div>
            <h1 className="font-display text-3xl sm:text-[34px] font-bold mt-3 leading-tight">
              Welcome back,{' '}
              <GradientText colors={['#ffffff', '#93c5fd', '#ffffff']} animationSpeed={6} className="!mx-0 !inline-flex !cursor-default">
                {user?.name || 'Vendor'}
              </GradientText>
            </h1>
            <p className="text-blue-100/80 mt-1.5 max-w-xl text-sm sm:text-base">
              {actionCount > 0 ? `You have ${actionCount} item${actionCount > 1 ? 's' : ''} waiting for you — quotes to submit, orders to acknowledge or dispatch.` : "You're all caught up. New RFQs and work orders will appear here the moment they're issued."}
            </p>
          </div>
          <div className="flex gap-6 sm:gap-8">
            <Hero n={pendingRfqs.length} label="Open RFQs" />
            <Hero n={issued.length + acknowledged.length} label="Active orders" />
            <Hero n={delivered.length} label="Delivered" />
          </div>
        </div>
      </motion.section>

      <Tabs id="vendor-tabs" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: t.key === 'quotations' ? pendingRfqs.length || undefined : t.key === 'work-orders' ? issued.length + acknowledged.length || undefined : t.key === 'delivery' ? inTransit.length || undefined : undefined }))} />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* ───── OVERVIEW ───── */}
          {tab === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard index={0} label="RFQs awaiting your quote" value={pendingRfqs.length} icon={FileSearch} tone="amber" onClick={() => { setTab('quotations'); setQuoteFilter('pending'); }} hint={pendingRfqs.length ? 'Respond to win the order' : 'Nothing pending'} />
                <StatCard index={1} label="Work orders in progress" value={issued.length + acknowledged.length} icon={ClipboardList} tone="blue" onClick={() => setTab('work-orders')} />
                <StatCard index={2} label="In transit" value={inTransit.length} icon={Truck} tone="violet" onClick={() => setTab('delivery')} />
                <StatCard index={3} label="Order value won" value={fmtINR(wonValue)} icon={IndianRupee} tone="emerald" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <Card title="Actions required" icon={Bell} description="Ordered by urgency">
                    <Stagger className="space-y-2.5">
                      {pendingRfqs.map((rfq) => (
                        <ActionRow key={`rfq-${rfq.rfq_id}`} tone="amber" icon={FileSearch} title="Quotation needed" sub={`${rfq.request?.product?.name} × ${rfq.request?.quantity} · ${rfq.request?.pr_number || `PR-${rfq.request_id}`}${rfq.request?.required_date ? ` · needed by ${fmtDate(rfq.request.required_date)}` : ''}`} cta="Submit quote" onClick={() => openQuote(rfq)} />
                      ))}
                      {issued.map((wo) => (
                        <ActionRow key={`iss-${wo.wo_id}`} tone="blue" icon={ClipboardList} title="Acknowledge work order" sub={`${wo.wo_number} · ${wo.items_description} · ${fmtINR(wo.agreed_price)}`} cta="Acknowledge" onClick={() => acknowledge(wo)} />
                      ))}
                      {acknowledged.map((wo) => (
                        <ActionRow key={`ack-${wo.wo_id}`} tone="violet" icon={Truck} title="Ready to dispatch" sub={`${wo.wo_number} · upload the tax invoice and confirm dispatch`} cta="Dispatch" onClick={() => openDispatch(wo)} />
                      ))}
                      {actionCount === 0 && (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <div><p className="text-sm font-semibold text-emerald-800">You're all caught up</p><p className="text-xs text-emerald-700/80">No actions required right now.</p></div>
                        </div>
                      )}
                    </Stagger>
                  </Card>

                  <Card title="Order progress" icon={PackageCheck} description="Your five most recent work orders" padded={false}>
                    {workOrders.length === 0 ? (
                      <EmptyState compact icon={ClipboardList} title="No work orders yet" description="Once a quotation is approved, the work order shows up here." />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {workOrders.slice(0, 5).map((wo) => <OrderProgress key={wo.wo_id} wo={wo} />)}
                      </div>
                    )}
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card title="Recent activity" icon={Activity} padded={false}>
                    {activity.length === 0 ? (
                      <EmptyState compact icon={Activity} title="No activity yet" />
                    ) : (
                      <Stagger className="divide-y divide-slate-100">
                        {activity.map((e, i) => {
                          const Icon = e.icon;
                          return (
                            <StaggerItem key={i} className="flex items-start gap-3 px-5 py-3">
                              <span className={cn('mt-0.5 w-7 h-7 rounded-lg grid place-items-center shrink-0', { amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-600' }[e.tone])}><Icon className="w-3.5 h-3.5" /></span>
                              <div className="min-w-0"><p className="text-[13px] text-slate-800 leading-snug">{e.text}</p><p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(e.at)}</p></div>
                            </StaggerItem>
                          );
                        })}
                      </Stagger>
                    )}
                  </Card>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3">How it works</p>
                    <ol className="space-y-2.5 text-sm text-slate-700">
                      {['Receive an RFQ and submit your quotation with both PDFs.', 'If approved, a work order is issued — acknowledge it.', 'Upload the tax invoice and mark the order dispatched.', 'Security verifies the invoice number at the gate.', 'Accounts release the bill once documents are signed.'].map((s, i) => (
                        <li key={i} className="flex gap-3"><span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">{i + 1}</span><span>{s}</span></li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ───── QUOTATIONS ───── */}
          {tab === 'quotations' && (
            <>
              <FilterChips value={quoteFilter} onChange={setQuoteFilter} options={[{ value: 'all', label: 'All', count: quoteCounts.all }, { value: 'pending', label: 'Awaiting your quote', count: quoteCounts.pending, dot: 'bg-amber-500' }, { value: 'submitted', label: 'Under review', count: quoteCounts.submitted, dot: 'bg-blue-500' }, { value: 'approved', label: 'Approved', count: quoteCounts.approved, dot: 'bg-emerald-500' }, { value: 'rejected', label: 'Not selected', count: quoteCounts.rejected, dot: 'bg-red-500' }]} />
              {filteredRfqs.length === 0 ? (
                <div className="surface"><EmptyState icon={FileSearch} title="No RFQs in this view" description="Requests for quotation from the college appear here." /></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRfqs.map((rfq, i) => {
                    const sub = rfq.submission;
                    const state = sub?.status === 'approved' ? 'approved' : sub?.status === 'rejected' ? 'rejected' : sub ? 'under_review' : 'pending';
                    const due = rfq.request?.required_date ? daysUntil(rfq.request.required_date) : null;
                    return (
                      <motion.div key={rfq.rfq_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className={cn('surface p-5 flex flex-col gap-3 surface-hover', state === 'pending' && 'border-amber-200', state === 'approved' && 'border-emerald-200')}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-xs font-semibold text-brand-700">{rfq.request?.pr_number || `PR-${rfq.request_id}`}</p>
                            <h3 className="font-display font-semibold text-slate-900 mt-0.5 leading-snug">{rfq.request?.product?.name || 'Product'}</h3>
                          </div>
                          <StatusBadge status={state === 'pending' ? 'pending' : state} pulse={state === 'pending'} />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge tone="blue">{rfq.request?.quantity} {rfq.request?.product?.unit || 'units'}</Badge>
                          {rfq.request?.priority && <Badge tone={rfq.request.priority === 'urgent' ? 'red' : rfq.request.priority === 'high' ? 'orange' : 'slate'}>{rfq.request.priority}</Badge>}
                          {due != null && <Badge tone={due < 0 ? 'red' : due <= 7 ? 'amber' : 'slate'}><CalendarClock className="w-3 h-3" /> {due < 0 ? 'overdue' : `needed in ${due}d`}</Badge>}
                        </div>
                        {rfq.request?.justification && <p className="text-xs text-slate-500 line-clamp-2">{rfq.request.justification}</p>}
                        <div className="mt-auto pt-3 border-t border-slate-100">
                          {!sub ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-500">Received {fmtDate(rfq.sent_at)}</span>
                              <Button size="sm" icon={Upload} onClick={() => openQuote(rfq)}>Submit quote</Button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-baseline justify-between"><span className="text-xs text-slate-500">Your quote</span><span className="font-display font-bold text-slate-900 tabular">{fmtINR(sub.quoted_price)}</span></div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400"><span>Submitted {fmtDateTime(sub.submitted_at)}</span>{sub.validity_days && <span>valid {sub.validity_days}d</span>}</div>
                              {sub.admin_remarks && <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">Admin: {sub.admin_remarks}</p>}
                              {state === 'approved' && <p className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Congratulations — expect a work order shortly.</p>}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ───── WORK ORDERS ───── */}
          {tab === 'work-orders' && (
            <>
              <FilterChips value={woFilter} onChange={setWoFilter} options={[{ value: 'all', label: 'All', count: workOrders.length }, { value: 'issued', label: 'To acknowledge', count: issued.length, dot: 'bg-amber-500' }, { value: 'acknowledged', label: 'To dispatch', count: acknowledged.length, dot: 'bg-violet-500' }, { value: 'dispatched', label: 'Dispatched', count: inTransit.length, dot: 'bg-blue-500' }]} />
              {filteredWos.length === 0 ? (
                <div className="surface"><EmptyState icon={ClipboardList} title="No work orders in this view" description="Work orders are issued once your quotation is approved." /></div>
              ) : (
                <div className="space-y-4">
                  {filteredWos.map((wo, i) => {
                    const pct = wo.status === 'issued' ? 25 : wo.status === 'acknowledged' ? 50 : wo.gate_entry?.invoice_verified ? 100 : wo.status === 'dispatched' ? 75 : 10;
                    const late = daysUntil(wo.delivery_deadline) < 0 && !wo.gate_entry?.invoice_verified;
                    return (
                      <motion.div key={wo.wo_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="surface p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-base font-bold text-brand-700">{wo.wo_number}</p>
                            <p className="text-sm text-slate-700 mt-0.5">{wo.items_description}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Issued {fmtDate(wo.created_at)} · Qty {wo.quantity} · {fmtINR(wo.agreed_price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {late && <Badge tone="red" dot>Past deadline</Badge>}
                            <StatusBadge status={wo.status} pulse={wo.status === 'issued'} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <Progress value={pct} tone={wo.gate_entry?.invoice_verified ? 'emerald' : wo.status === 'dispatched' ? 'violet' : 'brand'} />
                          <div className="mt-1.5 grid grid-cols-4 text-[10.5px] text-slate-400 font-medium">
                            {['Issued', 'Acknowledged', 'Dispatched', 'Delivered'].map((s, idx) => <span key={s} className={cn(idx * 25 < pct && 'text-slate-700')}>{s}</span>)}
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <KV label="Deadline" value={<span className={late ? 'text-red-600' : ''}>{fmtDate(wo.delivery_deadline)}</span>} />
                          <KV label="Acknowledged" value={wo.acknowledged_at ? fmtDateTime(wo.acknowledged_at) : '—'} />
                          <KV label="Dispatched" value={wo.dispatched_at ? fmtDateTime(wo.dispatched_at) : '—'} />
                          <KV label="Tax invoice" value={wo.tax_invoice_number || '—'} mono />
                        </div>
                        {wo.terms && <p className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-3"><span className="font-semibold">Terms:</span> {wo.terms}</p>}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {wo.wo_file_url && <a href={fileUrl(wo.wo_file_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"><FileText className="w-3.5 h-3.5" /> Work order PDF <ExternalLink className="w-3 h-3 opacity-60" /></a>}
                          {wo.tax_invoice_url && <a href={fileUrl(wo.tax_invoice_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"><FileText className="w-3.5 h-3.5" /> Your tax invoice <ExternalLink className="w-3 h-3 opacity-60" /></a>}
                          <span className="flex-1" />
                          {wo.status === 'issued' && <Button icon={CheckCircle2} onClick={() => acknowledge(wo)}>Acknowledge work order</Button>}
                          {wo.status === 'acknowledged' && <Button variant="violet" icon={Truck} onClick={() => openDispatch(wo)}>Mark as dispatched</Button>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ───── DELIVERIES ───── */}
          {tab === 'delivery' && (
            <>
              {inTransit.length === 0 && delivered.length === 0 ? (
                <div className="surface"><EmptyState icon={Truck} title="Nothing in transit" description="Dispatched orders appear here with live gate and billing status." /></div>
              ) : (
                <div className="space-y-4">
                  {[...inTransit, ...delivered.filter((d) => !inTransit.includes(d))].map((wo, i) => {
                    const stages = [
                      { label: 'Dispatched', icon: Truck, done: true, at: wo.dispatched_at },
                      { label: 'Arrived at gate', icon: DoorOpen, done: !!wo.gate_entry, at: wo.gate_entry?.entry_time },
                      { label: 'Verified & documented', icon: FileCheck, done: !!wo.gate_entry?.invoice_verified, at: wo.gate_entry?.entry_time },
                      { label: 'Bill released', icon: CheckCircle2, done: !!wo.gate_entry?.billing_document?.bill_released, at: wo.gate_entry?.billing_document?.bill_released_at },
                    ];
                    const doneCount = stages.filter((s) => s.done).length;
                    const overdue = wo.expected_delivery && new Date(wo.expected_delivery) < new Date() && !wo.gate_entry?.invoice_verified;
                    const blocked = wo.gate_entry && !wo.gate_entry.invoice_verified;
                    return (
                      <motion.div key={wo.wo_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="surface p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-base font-bold text-brand-700">{wo.wo_number}</p>
                            <p className="text-sm text-slate-700">{wo.items_description} · Qty {wo.quantity}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Tax invoice <span className="font-mono">{wo.tax_invoice_number || '—'}</span></p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>Dispatched {fmtDate(wo.dispatched_at)}</p>
                            <p className={cn(overdue && 'text-red-600 font-semibold')}>Expected {fmtDate(wo.expected_delivery)}</p>
                          </div>
                        </div>
                        <div className="mt-5 relative">
                          <div className="absolute left-[12.5%] right-[12.5%] top-4 h-0.5 bg-slate-200" />
                          <motion.div className="absolute left-[12.5%] top-4 h-0.5 bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${Math.max(0, (doneCount - 1) / 3) * 75}%` }} transition={{ duration: 0.6 }} />
                          <div className="relative grid grid-cols-4">
                            {stages.map((s) => (
                              <div key={s.label} className="flex flex-col items-center text-center">
                                <span className={cn('w-8 h-8 rounded-full grid place-items-center border-2 bg-white', s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400')}><s.icon className="w-3.5 h-3.5" /></span>
                                <p className={cn('mt-1.5 text-[11px] font-medium', s.done ? 'text-slate-800' : 'text-slate-400')}>{s.label}</p>
                                {s.done && s.at && <p className="text-[10px] text-slate-400">{fmtDate(s.at)}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                        {blocked && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs px-3.5 py-2.5 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Invoice number mismatch at the gate — the college admin has been notified. Please contact them.</div>}
                        {overdue && !blocked && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3.5 py-2.5 flex items-center gap-2"><Clock className="w-4 h-4" /> This delivery is past its expected date.</div>}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ───── Quote modal ───── */}
      <Modal open={!!quoteModal} onClose={() => setQuoteModal(null)} size="lg" icon={Upload} title={`Submit quotation · ${quoteModal?.request?.product?.name || ''}`} description={quoteModal ? `${quoteModal.request?.pr_number || `PR-${quoteModal.request_id}`} · ${quoteModal.request?.quantity} ${quoteModal.request?.product?.unit || 'units'}` : ''} footer={
        <>
          <Button variant="secondary" onClick={() => setQuoteModal(null)}>Cancel</Button>
          <Button loading={uploading} disabled={!quoteForm.quotation_file || !quoteForm.proforma_file || Number(quoteForm.quoted_price) <= 0} icon={Upload} onClick={submitQuotation}>Submit quotation</Button>
        </>
      }>
        <div className="space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3.5 py-2.5 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> Both PDFs are mandatory — submissions without a quotation and a proforma invoice are rejected automatically.</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Quotation document (PDF)" required><FileDrop file={quoteForm.quotation_file} onChange={(f) => setQuoteForm((p) => ({ ...p, quotation_file: f }))} label="Drop quotation PDF" /></Field>
            <Field label="Proforma invoice (PDF)" required><FileDrop file={quoteForm.proforma_file} onChange={(f) => setQuoteForm((p) => ({ ...p, proforma_file: f }))} label="Drop proforma PDF" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Total quoted price (₹)" required hint={quoteModal?.request?.quantity && Number(quoteForm.quoted_price) > 0 ? `≈ ${fmtINR(Number(quoteForm.quoted_price) / quoteModal.request.quantity, { decimals: true })} per unit` : 'Inclusive of taxes and delivery'}>
              <Input type="number" min="1" autoFocus value={quoteForm.quoted_price} onChange={(e) => setQuoteForm((p) => ({ ...p, quoted_price: e.target.value }))} placeholder="e.g. 50000" leftIcon={IndianRupee} />
            </Field>
            <Field label="Validity (days)"><Input type="number" min="1" value={quoteForm.validity_days} onChange={(e) => setQuoteForm((p) => ({ ...p, validity_days: e.target.value }))} /></Field>
          </div>
          <Field label="Notes (optional)"><Textarea rows={3} value={quoteForm.notes} onChange={(e) => setQuoteForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Delivery lead time, warranty, alternatives offered…" /></Field>
        </div>
      </Modal>

      {/* ───── Dispatch modal ───── */}
      <Modal open={!!dispatchModal} onClose={() => setDispatchModal(null)} icon={Truck} title={`Confirm dispatch · ${dispatchModal?.wo_number || ''}`} description={dispatchModal ? `${dispatchModal.items_description} · Qty ${dispatchModal.quantity}` : ''} footer={
        <>
          <Button variant="secondary" onClick={() => setDispatchModal(null)}>Cancel</Button>
          <Button variant="violet" loading={uploading} disabled={!canDispatch} icon={Truck} onClick={dispatch}>Confirm dispatch</Button>
        </>
      }>
        <div className="space-y-5">
          <div className="rounded-xl border border-orange-200 bg-orange-50 text-orange-900 text-xs px-3.5 py-2.5 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> Security will compare this invoice number with the paper invoice at the gate. It must match exactly or entry is blocked.</div>
          <Field label="Tax invoice number" required hint="Exactly as printed on the invoice">
            <Input autoFocus mono value={dispatchForm.tax_invoice_number} onChange={(e) => setDispatchForm((p) => ({ ...p, tax_invoice_number: e.target.value }))} placeholder="e.g. INV-2026-00123" className="!text-base" />
          </Field>
          <Field label="Tax invoice (PDF)" required><FileDrop file={dispatchForm.tax_invoice} onChange={(f) => setDispatchForm((p) => ({ ...p, tax_invoice: f }))} label="Drop tax invoice PDF" /></Field>
          <Field label="Expected delivery date" required><Input type="date" min={new Date().toISOString().slice(0, 10)} value={dispatchForm.expected_delivery} onChange={(e) => setDispatchForm((p) => ({ ...p, expected_delivery: e.target.value }))} /></Field>
          <ul className="grid grid-cols-3 gap-2 text-[11px]">
            {[['Invoice no.', !!dispatchForm.tax_invoice_number.trim()], ['PDF attached', !!dispatchForm.tax_invoice], ['Delivery date', !!dispatchForm.expected_delivery]].map(([l, ok]) => (
              <li key={l} className={cn('rounded-lg border px-2.5 py-2 flex items-center gap-1.5', ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500')}><CheckCircle2 className={cn('w-3.5 h-3.5', ok ? 'text-emerald-600' : 'text-slate-300')} /> {l}</li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

function Hero({ n, label }) {
  return (
    <div className="text-center sm:text-right">
      <p className="font-display text-3xl font-bold tabular leading-none"><CountUp to={n} duration={1} /></p>
      <p className="text-[11px] uppercase tracking-[0.12em] text-blue-200/60 mt-1.5">{label}</p>
    </div>
  );
}

function ActionRow({ tone, icon: Icon, title, sub, cta, onClick }) {
  const ring = { amber: 'border-amber-200 bg-amber-50/60', blue: 'border-blue-200 bg-blue-50/60', violet: 'border-violet-200 bg-violet-50/60' }[tone];
  const btn = { amber: 'warning', blue: 'primary', violet: 'violet' }[tone];
  const ic = { amber: 'text-amber-600', blue: 'text-blue-600', violet: 'text-violet-600' }[tone];
  return (
    <StaggerItem className={cn('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', ring)}>
      <span className={cn('w-9 h-9 rounded-lg bg-white grid place-items-center shrink-0', ic)}><Icon className="w-4 h-4" /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="text-xs text-slate-500 truncate">{sub}</p></div>
      <Button size="sm" variant={btn} onClick={onClick}>{cta} <ArrowRight className="w-3.5 h-3.5" /></Button>
    </StaggerItem>
  );
}

function OrderProgress({ wo }) {
  const stages = [
    { label: 'Quotation', done: !!wo.submission || true },
    { label: 'Issued', done: wo.status !== 'draft' },
    { label: 'Acknowledged', done: ['acknowledged', 'dispatched', 'completed'].includes(wo.status) || !!wo.acknowledged_at },
    { label: 'Dispatched', done: wo.status === 'dispatched' || !!wo.dispatched_at },
    { label: 'Delivered', done: !!wo.gate_entry?.invoice_verified },
  ];
  const done = stages.filter((s) => s.done).length;
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="min-w-0"><p className="font-mono text-xs font-semibold text-brand-700">{wo.wo_number}</p><p className="text-sm text-slate-700 truncate">{wo.request?.product?.name || wo.items_description}</p></div>
        <StatusBadge status={wo.gate_entry?.invoice_verified ? 'completed' : wo.status} pulse={false} />
      </div>
      <div className="flex items-center gap-1.5">
        {stages.map((s, i) => (
          <div key={s.label} className="flex-1">
            <div className={cn('h-1.5 rounded-full', s.done ? (i === stages.length - 1 ? 'bg-emerald-500' : 'bg-brand-500') : 'bg-slate-200')} />
            <p className={cn('mt-1 text-[10px] font-medium truncate', s.done ? 'text-slate-700' : 'text-slate-400')}>{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">{done}/{stages.length} stages complete</p>
    </div>
  );
}
