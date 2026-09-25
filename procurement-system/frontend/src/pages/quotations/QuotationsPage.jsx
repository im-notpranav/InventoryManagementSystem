import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, FileText, MessageSquarePlus, FileSearch, Trophy, Clock, CheckCircle2, ExternalLink, LayoutGrid, List, Filter } from 'lucide-react';
import api from '../../api/axios';
import { PageHeader, StatCard, DataTable, Button, Modal, Field, Textarea, SearchInput, FilterChips, StatusBadge, Badge, Tabs, Avatar, EmptyState, useToast, useConfirm, ErrorState, KV } from '../../components/ui';
import { fmtINR, fmtDate, fmtDateTime, fileUrl, dataOf, errMsg, cn } from '../../lib/utils';

export default function QuotationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('compare');
  const [remarks, setRemarks] = useState(null); // { prId, prNumber, text }
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/quotations');
      setSubs(dataOf(r));
    } catch (e) {
      setError(errMsg(e, 'Failed to load quotations'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: subs.length, pending: 0, approved: 0, rejected: 0 };
    subs.forEach((s) => {
      c[s.status] = (c[s.status] || 0) + 1;
    });
    return c;
  }, [subs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs.filter((s) => {
      if (status !== 'all' && s.status !== status) return false;
      if (!q) return true;
      return [s.vendor?.vendor_name, s.request?.pr_number, s.request?.product?.name].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [subs, search, status]);

  /** Group submissions by purchase request for side-by-side comparison. */
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => {
      const key = s.request?.request_id ?? s.request_id ?? 'unknown';
      if (!map.has(key)) map.set(key, { key, request: s.request, quotes: [] });
      map.get(key).quotes.push(s);
    });
    return [...map.values()].map((g) => {
      const prices = g.quotes.map((q) => Number(q.quoted_price || 0)).filter((n) => n > 0);
      const min = prices.length ? Math.min(...prices) : null;
      const max = prices.length ? Math.max(...prices) : null;
      return { ...g, min, max, quotes: g.quotes.sort((a, b) => Number(a.quoted_price || 0) - Number(b.quoted_price || 0)) };
    });
  }, [filtered]);

  const review = async (sub, newStatus) => {
    if (newStatus === 'approved') {
      const ok = await confirm({
        title: `Approve ${sub.vendor?.vendor_name}'s quote?`,
        message: `${fmtINR(sub.quoted_price)} for ${sub.request?.product?.name || 'item'} (${sub.request?.pr_number}). Other quotes for this request stay as they are.`,
        confirmText: 'Approve quote',
      });
      if (!ok) return;
    }
    setBusy(sub.submission_id);
    try {
      await api.put(`/quotations/review/${sub.submission_id}`, { status: newStatus, remarks: newStatus === 'rejected' ? 'Not competitive' : '' });
      toast.success(newStatus === 'approved' ? 'Quotation approved — you can now issue a work order' : 'Quotation rejected');
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Review failed'));
    } finally {
      setBusy(null);
    }
  };

  const saveRemarks = async () => {
    setBusy('remarks');
    try {
      await api.put(`/purchase-requests/${remarks.prId}/remarks`, { admin_remarks: remarks.text });
      toast.success('Remarks saved');
      setRemarks(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to save remarks'));
    } finally {
      setBusy(null);
    }
  };

  const FileChip = ({ url, label }) =>
    url ? (
      <a href={fileUrl(url)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 transition">
        <FileText className="w-3.5 h-3.5" /> {label} <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-xs text-slate-400">{label} missing</span>
    );

  const columns = [
    { key: 'vendor', header: 'Vendor', sortValue: (s) => s.vendor?.vendor_name, render: (s) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={s.vendor?.vendor_name} size="sm" />
        <span className="font-medium text-slate-800">{s.vendor?.vendor_name || '—'}</span>
      </div>
    ) },
    { key: 'request', header: 'Request', sortValue: (s) => s.request?.pr_number, render: (s) => (
      <div>
        <p className="font-mono text-xs font-semibold text-brand-700">{s.request?.pr_number || `PR-${s.request_id}`}</p>
        <p className="text-xs text-slate-500 cell-text">{s.request?.product?.name}</p>
      </div>
    ) },
    { key: 'quoted_price', header: 'Quote', align: 'right', sortValue: (s) => Number(s.quoted_price || 0), render: (s) => <span className="tabular font-semibold text-slate-900">{fmtINR(s.quoted_price)}</span> },
    { key: 'quoted_quantity', header: 'Qty', align: 'right', hideBelow: 'md', render: (s) => <span className="tabular">{s.quoted_quantity}</span> },
    { key: 'validity_days', header: 'Valid for', hideBelow: 'lg', render: (s) => (s.validity_days ? `${s.validity_days} days` : '—') },
    { key: 'files', header: 'Documents', sortable: false, hideBelow: 'md', render: (s) => <div className="flex gap-1.5 flex-wrap"><FileChip url={s.quotation_file_url} label="Quote" /><FileChip url={s.proforma_file_url} label="Proforma" /></div> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'actions', header: '', sortable: false, align: 'right', render: (s) => <Actions sub={s} /> },
  ];

  function Actions({ sub, size = 'xs' }) {
    return (
      <div className="flex justify-end gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <Button size={size} variant="ghost" icon={MessageSquarePlus} title="Admin remarks" onClick={() => setRemarks({ prId: sub.request?.request_id, prNumber: sub.request?.pr_number, text: sub.request?.admin_remarks || '' })}>
          Remarks
        </Button>
        {sub.status === 'pending' && (
          <>
            <Button size={size} variant="success-soft" icon={Check} loading={busy === sub.submission_id} onClick={() => review(sub, 'approved')}>Approve</Button>
            <Button size={size} variant="danger-soft" icon={X} disabled={!!busy} onClick={() => review(sub, 'rejected')}>Reject</Button>
          </>
        )}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Quotations"
        subtitle="Compare quotes side by side per request, approve the best one, then issue a work order."
        icon={FileSearch}
        actions={<Tabs id="quote-view" value={view} onChange={setView} tabs={[{ key: 'compare', label: 'Compare', icon: LayoutGrid }, { key: 'table', label: 'Table', icon: List }]} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Submissions" value={subs.length} icon={FileSearch} tone="brand" active={status === 'all'} onClick={() => setStatus('all')} />
        <StatCard index={1} loading={loading} label="Awaiting review" value={counts.pending} icon={Clock} tone="amber" active={status === 'pending'} onClick={() => setStatus('pending')} />
        <StatCard index={2} loading={loading} label="Approved" value={counts.approved} icon={CheckCircle2} tone="emerald" active={status === 'approved'} onClick={() => setStatus('approved')} />
        <StatCard index={3} loading={loading} label="Requests quoted" value={new Set(subs.map((s) => s.request?.request_id)).size} icon={Trophy} tone="violet" />
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vendor, PR number, product…" className="flex-1" />
        <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All', count: counts.all }, { value: 'pending', label: 'Pending', count: counts.pending, dot: 'bg-amber-500' }, { value: 'approved', label: 'Approved', count: counts.approved, dot: 'bg-emerald-500' }, { value: 'rejected', label: 'Rejected', count: counts.rejected, dot: 'bg-red-500' }]} />
      </div>

      {view === 'table' ? (
        <DataTable columns={columns} rows={filtered} rowKey="submission_id" loading={loading} emptyIcon={Filter} emptyTitle={subs.length ? 'No quotes match' : 'No quotations submitted yet'} emptyDescription={subs.length ? 'Adjust the filters.' : 'Send RFQs from Purchase Requests — vendor submissions appear here.'} footer={<span>{filtered.length} submissions</span>} />
      ) : loading ? (
        <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="surface h-56 skeleton" />)}</div>
      ) : groups.length === 0 ? (
        <div className="surface"><EmptyState icon={subs.length ? Filter : FileSearch} title={subs.length ? 'No quotes match' : 'No quotations yet'} description={subs.length ? 'Adjust the filters.' : 'Send RFQs from Purchase Requests — vendor submissions appear here for comparison.'} /></div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence initial={false}>
            {groups.map((g, gi) => {
              const anyApproved = g.quotes.some((q) => q.status === 'approved');
              return (
                <motion.section key={g.key} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: gi * 0.04 }} className="surface overflow-hidden">
                  <header className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-brand-700">{g.request?.pr_number || `PR-${g.key}`}</span>
                        {anyApproved && <Badge tone="emerald" dot>Vendor selected</Badge>}
                        {g.request?.priority && <Badge tone={g.request.priority === 'urgent' ? 'red' : g.request.priority === 'high' ? 'orange' : 'slate'} size="xs">{g.request.priority}</Badge>}
                      </div>
                      <h3 className="font-display font-semibold text-slate-900 mt-0.5 truncate">{g.request?.product?.name || 'Product'} <span className="text-slate-400 font-normal">× {g.request?.quantity}</span></h3>
                      <p className="text-xs text-slate-500">{g.request?.user?.department ? `${g.request.user.department} · ` : ''}{g.quotes.length} quote{g.quotes.length > 1 ? 's' : ''}{g.min != null && g.max != null && g.min !== g.max ? ` · range ${fmtINR(g.min)} – ${fmtINR(g.max)}` : ''}</p>
                    </div>
                    {g.min != null && g.max != null && g.max > g.min && (
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Potential saving</p>
                        <p className="font-display font-bold text-emerald-600 tabular">{fmtINR(g.max - g.min)}</p>
                      </div>
                    )}
                    <Button size="sm" variant="ghost" icon={MessageSquarePlus} onClick={() => setRemarks({ prId: g.request?.request_id, prNumber: g.request?.pr_number, text: g.request?.admin_remarks || '' })}>
                      Remarks
                    </Button>
                  </header>
                  {g.request?.admin_remarks && <div className="px-5 py-2 text-xs text-amber-900 bg-amber-50 border-b border-amber-100">Admin remarks: {g.request.admin_remarks}</div>}
                  <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {g.quotes.map((q, qi) => {
                      const isLowest = g.min != null && Number(q.quoted_price) === g.min && g.quotes.length > 1;
                      const diffPct = g.min ? ((Number(q.quoted_price) - g.min) / g.min) * 100 : 0;
                      return (
                        <motion.div
                          key={q.submission_id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: qi * 0.05 }}
                          className={cn('relative rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-card', q.status === 'approved' ? 'border-emerald-300 bg-emerald-50/40' : q.status === 'rejected' ? 'border-slate-200 bg-slate-50/60 opacity-80' : isLowest ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200 bg-white')}
                        >
                          {isLowest && q.status !== 'rejected' && (
                            <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-brand-700 text-white text-[10px] font-semibold px-2 py-0.5 shadow-card">
                              <Trophy className="w-3 h-3" /> Lowest quote
                            </span>
                          )}
                          <div className="flex items-start gap-2.5">
                            <Avatar name={q.vendor?.vendor_name} size="md" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">{q.vendor?.vendor_name}</p>
                              <p className="text-[11px] text-slate-500">Submitted {fmtDate(q.submitted_at)}</p>
                            </div>
                            <StatusBadge status={q.status} />
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="font-display text-2xl font-bold text-slate-900 tabular leading-none">{fmtINR(q.quoted_price)}</p>
                              <p className="text-[11px] text-slate-500 mt-1">for {q.quoted_quantity} units{q.validity_days ? ` · valid ${q.validity_days}d` : ''}</p>
                            </div>
                            {g.quotes.length > 1 && !isLowest && Number.isFinite(diffPct) && diffPct > 0 && <span className="text-xs font-semibold text-red-600 tabular">+{diffPct.toFixed(1)}%</span>}
                          </div>
                          {q.notes && <p className="text-xs text-slate-600 bg-white/70 rounded-lg p-2 border border-slate-100 line-clamp-2">{q.notes}</p>}
                          <div className="flex gap-1.5 flex-wrap"><FileChip url={q.quotation_file_url} label="Quote PDF" /><FileChip url={q.proforma_file_url} label="Proforma" /></div>
                          <div className="mt-auto pt-2 border-t border-slate-100"><Actions sub={q} size="sm" /></div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={!!remarks} onClose={() => setRemarks(null)} icon={MessageSquarePlus} title={`Admin remarks · ${remarks?.prNumber || ''}`} description="Visible to the department and vendors on this request." size="sm" footer={
        <>
          <Button variant="secondary" onClick={() => setRemarks(null)}>Cancel</Button>
          <Button loading={busy === 'remarks'} onClick={saveRemarks}>Save remarks</Button>
        </>
      }>
        <Field label="Remarks" hint={`${remarks?.text?.length || 0}/500`}>
          <Textarea autoFocus rows={4} value={remarks?.text || ''} onChange={(e) => setRemarks({ ...remarks, text: e.target.value.slice(0, 500) })} placeholder="Notes for this request — e.g. negotiate delivery timeline with the lowest bidder." />
        </Field>
      </Modal>
    </div>
  );
}
