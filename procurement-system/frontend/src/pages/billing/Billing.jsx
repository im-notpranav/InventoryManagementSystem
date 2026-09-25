import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, FileText, RefreshCw, Shield, Upload, Receipt, IndianRupee, Clock, ExternalLink, PenLine, ShieldCheck, BadgeCheck, AlertTriangle, Search as SearchIcon, Wallet } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import CountUp from '../../components/reactbits/CountUp/CountUp';
import { PageHeader, StatCard, Button, Tabs, SearchInput, StatusBadge, Badge, Progress, Textarea, EmptyState, ErrorState, Avatar, KV, useToast, useConfirm } from '../../components/ui';
import { fmtDateTime, fmtINR, fileUrl, dataOf, errMsg, cn } from '../../lib/utils';

export default function Billing() {
  const { isAdmin, isWatchman, isAccountant } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [allDocs, setAllDocs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [releasedDocs, setReleasedDocs] = useState([]);
  const [watchmanDocs, setWatchmanDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [search, setSearch] = useState('');
  const fileInputs = useRef({});

  const tabs = isAdmin
    ? [{ key: 'upload', label: 'Upload & sign', icon: PenLine }, { key: 'security', label: 'Security queue', icon: ShieldCheck }, { key: 'released', label: 'Released', icon: BadgeCheck }]
    : isAccountant
      ? [{ key: 'review', label: 'For review', icon: Wallet }, { key: 'released', label: 'Released', icon: BadgeCheck }]
      : [{ key: 'confirm', label: 'Confirm documents', icon: ShieldCheck }];
  const [tab, setTab] = useState(tabs[0].key);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        const [a, w, r] = await Promise.all([api.get('/billing'), api.get('/billing/watchman-queue'), api.get('/billing/released')]);
        setAllDocs(dataOf(a));
        setWatchmanDocs(dataOf(w));
        setReleasedDocs(dataOf(r));
      } else if (isAccountant) {
        const [p, r] = await Promise.all([api.get('/billing/pending'), api.get('/billing/released')]);
        setPendingDocs(dataOf(p));
        setReleasedDocs(dataOf(r));
      } else if (isWatchman) {
        setWatchmanDocs(dataOf(await api.get('/billing/watchman-queue')));
      }
    } catch (e) {
      setError(errMsg(e, 'Failed to load billing data.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id, fn, ok) => {
    setProcessing(id);
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setProcessing(null);
    }
  };

  const upload = (doc, file) => {
    const fd = new FormData();
    fd.append('scanned_invoice', file);
    return act(doc.doc_id, () => api.post(`/billing/${doc.entry_id}/upload-invoice`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }), 'Scanned invoice uploaded');
  };
  const adminSign = (doc) => act(doc.doc_id, () => api.post(`/billing/${doc.doc_id}/admin-sign`), 'Signed off as Admin');
  const watchmanConfirm = (doc) => act(doc.doc_id, () => api.post(`/billing/${doc.doc_id}/watchman-confirm`), 'Document receipt confirmed');
  const release = async (doc, amount) => {
    const ok = await confirm({ title: 'Release this bill for payment?', message: `${fmtINR(amount)} to ${doc.entry?.wo?.vendor?.vendor_name || 'vendor'}. This cannot be undone.`, confirmText: 'Release bill', tone: 'default' });
    if (!ok) return;
    act(doc.doc_id, () => api.post(`/billing/${doc.doc_id}/accountant-verify`, { accountant_remarks: remarks[doc.doc_id] || '' }), 'Bill released for payment');
  };

  const current = useMemo(() => {
    let list = [];
    if (isAdmin) list = tab === 'upload' ? allDocs.filter((d) => !d.bill_released) : tab === 'security' ? watchmanDocs : releasedDocs;
    else if (isAccountant) list = tab === 'review' ? pendingDocs : releasedDocs;
    else if (isWatchman) list = watchmanDocs;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => [d.entry?.entry_number, d.entry?.wo?.wo_number, d.entry?.wo?.vendor?.vendor_name, d.entry?.wo?.tax_invoice_number, d.status].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [tab, allDocs, watchmanDocs, releasedDocs, pendingDocs, isAdmin, isAccountant, isWatchman, search]);

  const releasedTotal = releasedDocs.reduce((a, d) => a + Number(d.entry?.wo?.agreed_price || 0), 0);
  const pendingCount = isAdmin ? allDocs.filter((d) => !d.bill_released).length : isAccountant ? pendingDocs.length : watchmanDocs.length;
  const pendingValue = (isAdmin ? allDocs.filter((d) => !d.bill_released) : isAccountant ? pendingDocs : watchmanDocs).reduce((a, d) => a + Number(d.entry?.wo?.agreed_price || 0), 0);

  const emptyCopy = isAccountant && tab === 'review'
    ? { title: 'No bills waiting for you', desc: 'Bills appear here once Admin has signed and Security has confirmed the documents.' }
    : isWatchman
      ? { title: 'Nothing to confirm', desc: 'Documents show up after Admin uploads and signs the scanned invoice.' }
      : tab === 'released'
        ? { title: 'No released bills yet', desc: 'Released bills will be listed here with the accountant’s remarks.' }
        : { title: 'No documents in this view', desc: 'Gate entries generate a billing document automatically.' };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills & Payments"
        subtitle={isAccountant ? 'Six-point verification before a bill is released — every check is documented.' : isWatchman ? 'Confirm that signed paperwork physically reached the gate office.' : 'Upload the scanned physical invoice, sign off, and track each bill to release.'}
        icon={Receipt}
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load} className={loading ? '[&>svg]:animate-spin' : ''}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label={isWatchman ? 'Awaiting confirmation' : 'In progress'} value={pendingCount} icon={Clock} tone="amber" />
        <StatCard index={1} loading={loading} label="Value in pipeline" value={fmtINR(pendingValue)} icon={IndianRupee} tone="brand" />
        {!isWatchman && <StatCard index={2} loading={loading} label="Released bills" value={releasedDocs.length} icon={BadgeCheck} tone="emerald" />}
        {!isWatchman && <StatCard index={3} loading={loading} label="Released value" value={fmtINR(releasedTotal)} icon={Wallet} tone="violet" />}
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <Tabs id="billing-tabs" value={tab} onChange={setTab} tabs={tabs.map((t) => ({ ...t, count: t.key === 'released' ? releasedDocs.length : t.key === 'review' ? pendingDocs.length : t.key === 'security' || t.key === 'confirm' ? watchmanDocs.length : t.key === 'upload' ? allDocs.filter((d) => !d.bill_released).length : undefined }))} />
        <SearchInput value={search} onChange={setSearch} placeholder="Entry, WO, vendor, invoice…" className="sm:w-72" />
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="surface h-64 skeleton" />)}</div>
      ) : current.length === 0 ? (
        <div className="surface"><EmptyState icon={FileText} title={emptyCopy.title} description={emptyCopy.desc} /></div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <AnimatePresence initial={false}>
            {current.map((doc, i) => (
              <DocCard key={doc.doc_id} doc={doc} index={i} role={{ isAdmin, isWatchman, isAccountant }} tab={tab} processing={processing} remarks={remarks} setRemarks={setRemarks} onUpload={upload} onAdminSign={adminSign} onWatchmanConfirm={watchmanConfirm} onRelease={release} fileInputs={fileInputs} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, index, role, tab, processing, remarks, setRemarks, onUpload, onAdminSign, onWatchmanConfirm, onRelease, fileInputs }) {
  const { isAdmin, isWatchman, isAccountant } = role;
  const wo = doc.entry?.wo;
  const sub = wo?.submission;
  const vendor = wo?.vendor;
  const items = wo?.request?.items || sub?.request?.items || [];
  const product = wo?.request?.product?.name || sub?.request?.product?.name || wo?.items_description || 'N/A';
  const amount = wo?.agreed_price;

  const checks = [
    { ok: !!sub?.proforma_file_url, label: 'Proforma invoice', detail: sub?.proforma_file_url ? <Doc url={sub.proforma_file_url} label="View proforma" /> : 'Not uploaded by vendor', who: 'Vendor' },
    { ok: !!wo?.wo_file_url, label: `Work order ${wo?.wo_number || ''}`, detail: wo?.wo_file_url ? <Doc url={wo.wo_file_url} label="View work order" /> : 'Not available', who: 'Admin' },
    { ok: !!wo?.tax_invoice_url, label: `Tax invoice ${wo?.tax_invoice_number || ''}`, detail: wo?.tax_invoice_url ? <Doc url={wo.tax_invoice_url} label="View tax invoice" /> : 'Not uploaded by vendor', who: 'Vendor' },
    { ok: !!doc.scanned_invoice_url, label: 'Scanned physical invoice', detail: doc.scanned_invoice_url ? <><Doc url={doc.scanned_invoice_url} label="View scan" /> <span className="text-slate-400">· by {doc.uploader?.name || 'Admin'}</span></> : 'Awaiting upload', who: 'Admin' },
    { ok: !!doc.admin_signed, label: 'Admin sign-off', detail: doc.admin_signed ? `${doc.admin_user?.name || 'Admin'} · ${fmtDateTime(doc.admin_signed_at)}` : 'Awaiting signature', who: 'Admin' },
    { ok: !!doc.watchman_confirmed, label: 'Security confirmation', detail: doc.watchman_confirmed ? `${doc.watchman_user?.name || 'Security'} · ${fmtDateTime(doc.watchman_confirmed_at)}` : 'Awaiting confirmation', who: 'Security' },
  ];
  const done = checks.filter((c) => c.ok).length;
  const all = done === checks.length;
  const busy = processing === doc.doc_id;
  const tone = done < 4 ? 'red' : done < 6 ? 'amber' : 'emerald';

  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: Math.min(index, 6) * 0.05 }} className="surface overflow-hidden flex flex-col">
      {/* header */}
      <div className="relative px-5 py-4 text-white" style={{ background: doc.status === 'released' ? 'linear-gradient(135deg, #064e3b, #059669)' : 'linear-gradient(135deg, #0f172a, #1e3a5f 60%, #2e75b6)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 90% 10%, #fff, transparent 40%)' }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-lg font-bold leading-tight">{doc.entry?.entry_number || `DOC-${doc.doc_id}`}</p>
            <p className="text-xs text-white/70 mt-0.5">WO {wo?.wo_number || 'N/A'} · gate {fmtDateTime(doc.entry?.entry_time)}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-2 justify-end">
              <Avatar name={vendor?.vendor_name} size="xs" />
              <p className="text-sm font-semibold cell-text">{vendor?.vendor_name || 'Unknown vendor'}</p>
            </div>
            <div className="mt-1.5"><StatusBadge status={doc.status} pulse={false} className="!bg-white/15 !text-white !ring-white/20" /></div>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold">{items.length > 1 ? 'Products' : 'Product'}</p>
            <p className="text-sm font-medium text-slate-800 mt-0.5">{items.length ? items.map((it) => `${it.product?.name} ×${it.quantity}`).join(', ') : product}</p>
          </div>
          {amount != null && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Amount</p>
              <p className="font-display text-2xl font-bold text-slate-900 tabular leading-none mt-0.5">{fmtINR(amount)}</p>
            </div>
          )}
        </div>

        {wo?.tax_invoice_number && <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Tax invoice ref <span className="font-mono font-semibold">{wo.tax_invoice_number}</span>{doc.entry?.invoice_verified ? <Badge tone="emerald" size="xs" className="ml-auto">Gate verified</Badge> : <Badge tone="red" size="xs" className="ml-auto">Gate mismatch</Badge>}</div>}

        {/* checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Verification checklist</p>
            <span className={cn('text-xs font-semibold tabular', { red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-600' }[tone])}>{done}/6 complete</span>
          </div>
          <Progress value={(done / 6) * 100} tone={tone} />
          <ul className="mt-3 divide-y divide-slate-100">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-3 py-2">
                <motion.span initial={false} animate={{ scale: c.ok ? [1, 1.15, 1] : 1 }} className={cn('mt-0.5 w-5 h-5 rounded-full grid place-items-center shrink-0', c.ok ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300')}>{c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}</motion.span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className={cn('text-[13px] font-medium', c.ok ? 'text-slate-800' : 'text-slate-500')}>{c.label}</p><span className="text-[10px] text-slate-400 uppercase tracking-wider">{c.who}</span></div>
                  <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 space-y-3">
          {isAdmin && !doc.bill_released && (
            <div className="flex flex-wrap gap-2">
              {!doc.scanned_invoice_url && (
                <>
                  <input type="file" accept=".pdf,image/*" className="hidden" ref={(el) => { fileInputs.current[doc.doc_id] = el; }} onChange={(e) => e.target.files?.[0] && onUpload(doc, e.target.files[0])} />
                  <Button icon={Upload} loading={busy} onClick={() => fileInputs.current[doc.doc_id]?.click()}>Upload scanned invoice</Button>
                </>
              )}
              {doc.scanned_invoice_url && !doc.admin_signed && <Button variant="success" icon={PenLine} loading={busy} onClick={() => onAdminSign(doc)}>Sign off as Admin</Button>}
              {doc.admin_signed && !doc.watchman_confirmed && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Waiting for Security to confirm the documents.</p>}
              {doc.watchman_confirmed && doc.status !== 'released' && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> With Accounts for release.</p>}
            </div>
          )}

          {(isWatchman || (isAdmin && tab === 'security')) && !doc.watchman_confirmed && doc.scanned_invoice_url && (
            <div>
              {!doc.admin_signed && <p className="text-xs text-amber-700 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Admin has not signed yet — confirm only if the paperwork is in hand.</p>}
              <Button className="w-full" icon={ShieldCheck} loading={busy} onClick={() => onWatchmanConfirm(doc)}>Confirm document receipt</Button>
            </div>
          )}

          {isAccountant && doc.status === 'ready_for_accountant' && (
            <div className="space-y-2.5">
              {!all && <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs px-3 py-2">Missing: {checks.filter((c) => !c.ok).map((c) => c.label).join(', ')}</div>}
              <Textarea rows={2} placeholder="Verification remarks (optional)" value={remarks[doc.doc_id] || ''} onChange={(e) => setRemarks({ ...remarks, [doc.doc_id]: e.target.value })} />
              <Button className="w-full" size="lg" variant={all ? 'success' : 'secondary'} disabled={!all} loading={busy} icon={BadgeCheck} onClick={() => onRelease(doc, amount)}>
                {all ? `Release ${fmtINR(amount)} for payment` : 'Complete all checks to release'}
              </Button>
            </div>
          )}

          {doc.status === 'released' && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-900">Released {fmtDateTime(doc.bill_released_at)}</p>
                <p className="text-xs text-emerald-800/80">by {doc.accountant_user?.name || 'Accountant'}{doc.accountant_remarks ? ` — “${doc.accountant_remarks}”` : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Doc({ url, label }) {
  const href = fileUrl(url);
  if (!href) return <span className="text-red-500">Not uploaded</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 font-medium hover:underline">
      {label} <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}
