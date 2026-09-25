import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoorOpen, ShieldCheck, Truck, CheckCircle2, XCircle, ArrowLeft, Printer, RotateCcw, Package, Calendar, Search as SearchIcon, ClipboardCheck, AlertTriangle, History, Hash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DecryptedText from '../../components/reactbits/DecryptedText/DecryptedText';
import { PageHeader, StatCard, Card, DataTable, Button, Field, Input, SearchInput, Badge, StatusBadge, EmptyState, KV, useToast } from '../../components/ui';
import { fmtDate, fmtDateTime, dataOf, errMsg, daysUntil, cn } from '../../lib/utils';
import { useReducedMotion } from '../../hooks';

const EMPTY = { vehicle_number: '', driver_name: '', num_packages: '', tax_invoice_number: '' };

export default function GateEntry() {
  const { user, isWatchman } = useAuth();
  const toast = useToast();
  const reduced = useReducedMotion();

  const [dispatched, setDispatched] = useState([]);
  const [entries, setEntries] = useState([]);
  const [confirmDocs, setConfirmDocs] = useState([]);
  const [loadingWos, setLoadingWos] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const loadWos = async () => {
    setLoadingWos(true);
    try {
      const r = await api.get('/work-orders/dispatched').catch(() => api.get('/work-orders?status=dispatched'));
      setDispatched(dataOf(r).filter((w) => w.status === 'dispatched' && !w.gate_entry));
    } catch {
      setDispatched([]);
    } finally {
      setLoadingWos(false);
    }
  };
  const loadEntries = async () => {
    setLoadingEntries(true);
    try {
      setEntries(dataOf(await api.get('/gate-entry')));
    } catch {
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };
  const loadDocs = async () => {
    if (!isWatchman) return;
    try {
      setConfirmDocs(dataOf(await api.get('/gate-entry/pending-confirmations')));
    } catch {
      setConfirmDocs([]);
    }
  };

  useEffect(() => {
    loadWos();
    loadEntries();
    loadDocs();
  }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dispatched.filter((w) => !q || [w.wo_number, w.vendor?.vendor_name, w.items_description, w.tax_invoice_number].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [dispatched, search]);

  const select = (wo) => {
    setSelected(wo);
    setForm(EMPTY);
    setResult(null);
  };

  const entered = form.tax_invoice_number.trim();
  const expected = selected?.tax_invoice_number?.trim() || '';
  const match = entered ? entered === expected : null;
  const canSubmit = selected && form.vehicle_number.trim() && form.driver_name.trim() && form.num_packages && entered && !submitting;

  const record = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post('/gate-entry/record', {
        wo_number: selected.wo_number,
        vehicle_number: form.vehicle_number.trim(),
        driver_name: form.driver_name.trim(),
        num_packages: parseInt(form.num_packages, 10),
        tax_invoice_number: entered,
      });
      const data = res.data?.data || res.data;
      setResult(data);
      if (data?.verified) toast.success(`Entry granted · ${data.entry?.entry_number || ''}`);
      else toast.warning('Entry blocked — invoice number mismatch');
      loadWos();
      loadEntries();
      loadDocs();
    } catch (e) {
      setResult({ error: true, message: errMsg(e, 'Failed to record entry') });
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setSelected(null);
    setForm(EMPTY);
    setResult(null);
  };

  const confirmDoc = async (doc) => {
    setConfirming(doc.doc_id);
    try {
      await api.put(`/billing/watchman-confirm/${doc.doc_id}`).catch(() => api.post(`/billing/${doc.doc_id}/watchman-confirm`));
      toast.success('Document receipt confirmed');
      loadDocs();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to confirm'));
    } finally {
      setConfirming(null);
    }
  };

  const today = entries.filter((e) => e.entry_time && new Date(e.entry_time).toDateString() === new Date().toDateString());
  const blockedCount = entries.filter((e) => !e.invoice_verified).length;

  const entryColumns = [
    { key: 'entry_number', header: 'Entry', hideBelow: 'md', render: (e) => <span className="font-mono text-xs font-semibold text-slate-800">{e.entry_number}</span> },
    { key: 'wo', header: 'Work order', sortValue: (e) => e.wo?.wo_number, render: (e) => <span className="font-mono text-xs text-brand-700">{e.wo?.wo_number || '—'}</span> },
    { key: 'vendor', header: 'Vendor', hideBelow: 'md', sortValue: (e) => e.wo?.vendor?.vendor_name, render: (e) => e.wo?.vendor?.vendor_name || '—' },
    { key: 'vehicle_number', header: 'Vehicle', hideBelow: 'lg', render: (e) => <span className="font-mono text-xs">{e.vehicle_number}</span> },
    { key: 'driver_name', header: 'Driver', hideBelow: 'lg' },
    { key: 'num_packages', header: 'Pkgs', align: 'right', hideBelow: 'md', render: (e) => <span className="tabular">{e.num_packages}</span> },
    { key: 'tax_invoice_number', header: 'Invoice #', hideBelow: 'md', render: (e) => <span className="font-mono text-xs">{e.tax_invoice_number}</span> },
    { key: 'invoice_verified', header: 'Result', render: (e) => <StatusBadge status={e.invoice_verified ? 'verified' : 'blocked'} pulse={false} /> },
    { key: 'entry_time', header: 'Time', sortValue: (e) => new Date(e.entry_time).getTime(), render: (e) => <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(e.entry_time)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Gate Entry" subtitle="Select the dispatched work order, record the vehicle, and verify the paper invoice number against the vendor's declaration." icon={DoorOpen} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loadingWos} label="Awaiting arrival" value={dispatched.length} icon={Truck} tone="violet" hint="Dispatched, not yet at gate" />
        <StatCard index={1} loading={loadingEntries} label="Entries today" value={today.length} icon={DoorOpen} tone="brand" />
        <StatCard index={2} loading={loadingEntries} label="Verified" value={entries.filter((e) => e.invoice_verified).length} icon={ShieldCheck} tone="emerald" />
        <StatCard index={3} loading={loadingEntries} label="Blocked" value={blockedCount} icon={XCircle} tone={blockedCount ? 'red' : 'slate'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* LEFT: incoming */}
        <Card className="lg:col-span-2" title="Incoming deliveries" icon={Truck} description={`${dispatched.length} dispatched`} padded={false}>
          <div className="p-3 border-b border-slate-100"><SearchInput value={search} onChange={setSearch} placeholder="WO number, vendor, product, invoice…" /></div>
          <div className="max-h-[520px] overflow-y-auto p-3 space-y-2">
            {loadingWos ? (
              [1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)
            ) : filtered.length === 0 ? (
              <EmptyState compact icon={Truck} title={dispatched.length ? 'No matches' : 'No deliveries en route'} description={dispatched.length ? 'Try a different search.' : 'Work orders appear here once vendors mark them dispatched.'} />
            ) : (
              filtered.map((wo) => {
                const sel = selected?.wo_id === wo.wo_id;
                const d = daysUntil(wo.expected_delivery);
                return (
                  <motion.button key={wo.wo_id} type="button" layout onClick={() => select(wo)} whileTap={{ scale: 0.99 }} className={cn('w-full text-left rounded-xl border p-3.5 transition-all', sel ? 'border-brand-500 bg-brand-50/60 shadow-glow' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-card')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-brand-700">{wo.wo_number}</span>
                      <Badge tone="violet" dot pulse={!sel}>Dispatched</Badge>
                    </div>
                    <p className="text-sm text-slate-800 mt-1.5 flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400" /> {wo.items_description} <span className="text-slate-400">× {wo.quantity}</span></p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" /> {wo.vendor?.vendor_name || '—'}</p>
                    <div className="flex items-center justify-between mt-2 text-[11px]">
                      <span className={cn('flex items-center gap-1', d != null && d < 0 ? 'text-red-600 font-medium' : 'text-slate-500')}><Calendar className="w-3 h-3" /> {d != null && d < 0 ? `${Math.abs(d)}d overdue` : `expected ${fmtDate(wo.expected_delivery)}`}</span>
                      <span className="font-mono text-slate-500 flex items-center gap-1"><Hash className="w-3 h-3" />{wo.tax_invoice_number || '—'}</span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </Card>

        {/* RIGHT: record */}
        <Card className="lg:col-span-3 min-h-[420px]" title={result ? 'Verification result' : selected ? `Record entry · ${selected.wo_number}` : 'Record entry'} icon={ClipboardCheck} actions={selected && !result && <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={resetAll}>Change order</Button>}>
          <AnimatePresence mode="wait">
            {!selected && !result ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState icon={ArrowLeft} title="Select a dispatched work order" description="Pick a delivery from the list to record the vehicle details and verify the invoice number." />
              </motion.div>
            ) : result ? (
              <ResultPanel key="result" result={result} form={form} onRetry={() => { setResult(null); setForm((p) => ({ ...p, tax_invoice_number: '' })); }} onReset={resetAll} reduced={reduced} />
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
                    <KV label="Product" value={selected.request?.product?.name || selected.items_description} />
                    <KV label="Quantity" value={selected.quantity} />
                    <KV label="Vendor" value={selected.vendor?.vendor_name} />
                    <KV label="Expected" value={fmtDate(selected.expected_delivery)} />
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-amber-700 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vendor-declared invoice number</p>
                    <p className="font-mono text-xl font-bold text-slate-900 mt-1 break-all">{expected || '—'}</p>
                    <p className="text-[11px] text-amber-800 mt-1">The paper invoice must match this exactly.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Vehicle number" required><Input autoFocus mono placeholder="KA-01-AB-1234" value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} /></Field>
                  <Field label="Driver name" required><Input placeholder="Full name" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></Field>
                  <Field label="Number of packages" required><Input type="number" min="1" value={form.num_packages} onChange={(e) => setForm({ ...form, num_packages: e.target.value })} /></Field>
                  <Field label="Invoice number on paper" required hint="Type exactly as printed">
                    <Input mono className={cn('!text-base', match === true && '!border-emerald-400 !bg-emerald-50/40', match === false && '!border-red-400 !bg-red-50/40')} placeholder="INV-…" value={form.tax_invoice_number} onChange={(e) => setForm({ ...form, tax_invoice_number: e.target.value })} />
                  </Field>
                </div>

                <AnimatePresence>
                  {entered && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className={cn('rounded-xl border px-4 py-3 text-sm flex items-start gap-2.5', match ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800')}>
                        {match ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        <div>
                          <p className="font-semibold">{match ? 'Numbers match — entry will be verified' : 'Numbers do not match'}</p>
                          {!match && <p className="text-xs mt-0.5">Expected <span className="font-mono font-semibold">{expected}</span> · entered <span className="font-mono font-semibold">{entered}</span>. Recording will block entry and alert Admin.</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button size="lg" className="w-full" icon={ShieldCheck} loading={submitting} disabled={!canSubmit} onClick={record} variant={match === false ? 'danger' : 'primary'}>
                  {match === false ? 'Record & block entry' : 'Record entry & verify'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* Watchman: document confirmations */}
      {isWatchman && (
        <Card title="Documents awaiting your confirmation" icon={ClipboardCheck} description="Confirm you physically received the signed paperwork" padded={false}>
          {confirmDocs.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Nothing to confirm" description="Documents appear here after Admin signs off the scanned invoice." />
          ) : (
            <div className="divide-y divide-slate-100">
              {confirmDocs.map((doc) => (
                <div key={doc.doc_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center"><ClipboardCheck className="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-slate-800">{doc.entry?.entry_number || `DOC-${doc.doc_id}`}</p>
                    <p className="text-xs text-slate-500 truncate">{doc.entry?.wo?.vendor?.vendor_name} · {doc.entry?.wo?.items_description}</p>
                  </div>
                  <Button size="sm" icon={CheckCircle2} loading={confirming === doc.doc_id} onClick={() => confirmDoc(doc)}>Confirm receipt</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* History */}
      <Card title="Recent entries" icon={History} description={`${entries.length} recorded`} padded={false}>
        <DataTable className="!border-0 !shadow-none !rounded-none" columns={entryColumns} rows={entries} rowKey="entry_id" loading={loadingEntries} initialSort={{ key: 'entry_time', dir: 'desc' }} emptyIcon={DoorOpen} emptyTitle="No gate entries yet" emptyDescription="Recorded entries will appear here with their verification result." rowClassName={(e) => (!e.invoice_verified ? 'bg-red-50/30' : '')} />
      </Card>
    </div>
  );
}

function ResultPanel({ result, form, onRetry, onReset, reduced }) {
  if (result.error) {
    return (
      <motion.div key="err" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <XCircle className="w-14 h-14 text-red-500 mx-auto" />
        <p className="font-display text-2xl font-bold text-red-800 mt-3">Could not record entry</p>
        <p className="text-red-700 mt-1">{result.message}</p>
        <div className="mt-5 flex justify-center gap-2"><Button variant="secondary" icon={RotateCcw} onClick={onRetry}>Try again</Button><Button onClick={onReset}>Select another order</Button></div>
      </motion.div>
    );
  }
  if (result.verified) {
    return (
      <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center print:border-0">
        {!reduced && [...Array(10)].map((_, i) => (
          <motion.span key={i} className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ left: `${10 + i * 8}%`, top: '40%' }} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: [-10, -80 - (i % 3) * 20], x: [(i % 2 ? 1 : -1) * (10 + i * 3)] }} transition={{ duration: 1.4, delay: 0.1 + i * 0.05 }} />
        ))}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }} className="w-16 h-16 rounded-full bg-emerald-500 text-white grid place-items-center mx-auto shadow-[0_12px_30px_-8px_rgba(16,185,129,0.6)]">
          <CheckCircle2 className="w-9 h-9" />
        </motion.div>
        <p className="font-display text-3xl font-bold text-emerald-800 mt-4 tracking-tight">
          {reduced ? 'ENTRY GRANTED' : <DecryptedText text="ENTRY GRANTED" animateOn="view" sequential speed={40} revealDirection="start" />}
        </p>
        <p className="font-mono text-xl text-brand-700 font-semibold mt-1">{result.entry?.entry_number}</p>
        <p className="text-xs text-slate-500 mt-1">{fmtDateTime(new Date())}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-left max-w-md mx-auto">
          <KV label="Vendor" value={result.vendor_name} />
          <KV label="Items" value={result.items} />
          <KV label="Vehicle" value={form.vehicle_number} mono />
        </div>
        <div className="mt-6 flex justify-center gap-2 no-print"><Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print gate pass</Button><Button icon={RotateCcw} onClick={onReset}>Record another</Button></div>
      </motion.div>
    );
  }
  return (
    <motion.div key="blocked" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.45 }} className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500 text-white grid place-items-center mx-auto shadow-[0_12px_30px_-8px_rgba(239,68,68,0.6)]"><XCircle className="w-9 h-9" /></div>
      <p className="font-display text-3xl font-bold text-red-800 mt-4 tracking-tight">ENTRY BLOCKED</p>
      <p className="text-red-700 mt-1">Tax invoice number mismatch</p>
      <div className="mt-4 inline-grid grid-cols-2 gap-4 text-left rounded-xl bg-white border border-red-100 p-4">
        <KV label="Expected" value={<span className="font-mono">{result.expected_invoice}</span>} />
        <KV label="Entered" value={<span className="font-mono text-red-600">{result.entered_invoice}</span>} />
      </div>
      <p className="text-xs text-slate-500 mt-3">Admin has been notified automatically. Do not allow the vehicle in until this is resolved.</p>
      <div className="mt-5 flex justify-center gap-2"><Button variant="secondary" icon={RotateCcw} onClick={onRetry}>Re-enter number</Button><Button onClick={onReset}>Select another order</Button></div>
    </motion.div>
  );
}
