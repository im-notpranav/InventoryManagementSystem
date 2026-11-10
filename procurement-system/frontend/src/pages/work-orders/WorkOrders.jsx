// HOD view of work orders. A work order is created automatically when a quotation
// is selected; this page tracks delivery against it (ledger + shipments).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Truck, CheckCircle2, IndianRupee, Filter, Printer, ExternalLink, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import { LedgerTable, ShipmentCard, DocLink, SectionTitle, DeptBadge } from '../../components/order/OrderParts';
import { PageHeader, StatCard, DataTable, Button, SearchInput, FilterChips, StatusBadge, KV, Progress, useToast, ErrorState } from '../../components/ui';
import { fmtINR, fmtDate, dataOf, errMsg, daysUntil, cn } from '../../lib/utils';
import { statusMeta } from '../../lib/status';

const STATUSES = ['issued', 'in_delivery', 'completed'];
const progressOf = (wo) => {
  const ordered = (wo.ledger || []).reduce((s, l) => s + l.ordered, 0);
  const accepted = (wo.ledger || []).reduce((s, l) => s + Math.min(l.accepted, l.ordered), 0);
  return ordered ? Math.round((accepted / ordered) * 100) : 0;
};

export default function WorkOrders() {
  const toast = useToast();
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setWos(dataOf(await api.get('/work-orders')));
    } catch (e) {
      setError(errMsg(e, 'Failed to load work orders'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const allowRetry = async (s) => {
    setBusy(s.shipment_id);
    try {
      await api.post(`/shipments/${s.shipment_id}/allow-retry`);
      toast.success('The vendor can bring the delivery back to the gate.', { title: 'Retry allowed' });
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Could not allow a retry'));
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c = { all: wos.length };
    wos.forEach((w) => { c[w.status] = (c[w.status] || 0) + 1; });
    return c;
  }, [wos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wos.filter((w) => (status === 'all' || w.status === status)
      && (!q || [w.wo_number, w.vendor?.vendor_name, w.request?.pr_number, w.request?.user?.department].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [wos, search, status]);

  const blocked = wos.reduce((n, w) => n + (w.shipments || []).filter((s) => s.status === 'gate_blocked').length, 0);
  const committed = wos.reduce((s, w) => s + Number(w.agreed_price || 0), 0);

  const columns = [
    { key: 'wo_number', header: 'Work order', render: (w) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{w.wo_number}</span> },
    { key: 'vendor', header: 'Vendor', sortValue: (w) => w.vendor?.vendor_name, render: (w) => <span className="text-slate-700">{w.vendor?.vendor_name}</span> },
    { key: 'request', header: 'Request', hideBelow: 'lg', sortValue: (w) => w.request?.pr_number, render: (w) => (
      <div><p className="font-mono text-xs text-slate-600">{w.request?.pr_number}</p><DeptBadge department={w.request?.user?.department} className="mt-0.5" /></div>
    ) },
    { key: 'agreed_price', header: 'Value', align: 'right', sortValue: (w) => Number(w.agreed_price), render: (w) => <span className="tabular text-slate-900">{fmtINR(w.agreed_price)}</span> },
    { key: 'deadline', header: 'Deliver by', hideBelow: 'md', sortValue: (w) => new Date(w.delivery_deadline).getTime(), render: (w) => {
      const d = daysUntil(w.delivery_deadline);
      const late = w.status !== 'completed' && d != null && d < 0;
      return <span className={cn('text-xs', late ? 'text-red-600 font-semibold' : 'text-slate-600')}>{fmtDate(w.delivery_deadline)}{late ? ' · late' : ''}</span>;
    } },
    { key: 'progress', header: 'Received', hideBelow: 'md', sortValue: progressOf, render: (w) => (
      <div className="flex items-center gap-2 min-w-[110px]"><Progress value={progressOf(w)} size="sm" tone={w.status === 'completed' ? 'emerald' : 'brand'} /><span className="text-[11px] tabular text-slate-500">{progressOf(w)}%</span></div>
    ) },
    { key: 'status', header: 'Status', render: (w) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge status={w.status} />
        {(w.shipments || []).some((s) => s.status === 'gate_blocked') && <StatusBadge status="gate_blocked" size="xs" />}
      </div>
    ) },
  ];

  const names = (w) => new Map((w.ledger || []).map((l) => [l.request_item_id, l.product?.name]));

  const expand = (w) => (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label="Vendor" value={w.vendor?.vendor_name} />
        <KV label="Contact" value={w.vendor?.email} />
        <KV label="Quoted delivery" value={w.submission?.expected_delivery ? fmtDate(w.submission.expected_delivery) : '—'} />
        <KV label="Issued by" value={w.creator?.name} />
      </div>
      {w.terms && <div><SectionTitle>Terms</SectionTitle><p className="text-sm text-slate-700 whitespace-pre-line">{w.terms}</p></div>}
      <div>
        <SectionTitle>Quantities</SectionTitle>
        <LedgerTable ledger={w.ledger} />
      </div>
      <div>
        <SectionTitle>Deliveries ({(w.shipments || []).length})</SectionTitle>
        {(w.shipments || []).length ? (
          <div className="space-y-2">
            {w.shipments.map((s) => (
              <ShipmentCard
                key={s.shipment_id}
                shipment={s}
                names={names(w)}
                actions={s.status === 'gate_blocked' && (
                  <Button size="xs" variant="warning" icon={RotateCcw} loading={busy === s.shipment_id} onClick={(e) => { e.stopPropagation(); allowRetry(s); }}>Allow retry</Button>
                )}
              />
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">The vendor has not invoiced a delivery yet.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <DocLink url={w.submission?.quotation_file_url} label="Quotation" />
        <Link to={`/work-orders/${w.wo_id}/print`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">
          <Printer className="w-3.5 h-3.5" /> Print work order
        </Link>
        <Link to={`/purchase-requests?id=${w.request?.request_id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">
          <ExternalLink className="w-3.5 h-3.5" /> Open request
        </Link>
      </div>
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Created automatically when you select a quotation. Track every delivery until it is accepted."
        icon={ClipboardList}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Open" value={(counts.issued || 0) + (counts.in_delivery || 0)} icon={Truck} tone="violet" />
        <StatCard index={1} loading={loading} label="Blocked at gate" value={blocked} icon={RotateCcw} tone={blocked ? 'red' : 'slate'} />
        <StatCard index={2} loading={loading} label="Completed" value={counts.completed || 0} icon={CheckCircle2} tone="emerald" />
        <StatCard index={3} loading={loading} label="Committed value" value={fmtINR(committed)} icon={IndianRupee} tone="brand" />
      </div>

      <div className="surface p-3 sm:p-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search work order, vendor, request…" />
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[{ value: 'all', label: 'All', count: counts.all }, ...STATUSES.filter((s) => counts[s]).map((s) => ({ value: s, label: statusMeta(s).label, count: counts[s] }))]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="wo_id"
        loading={loading}
        expandable={expand}
        emptyIcon={Filter}
        emptyTitle={wos.length ? 'No work orders match' : 'No work orders yet'}
        emptyDescription={wos.length ? 'Try another status or clear the search.' : 'Select a quotation on the Quotations page to issue one.'}
        footer={<span>Showing {filtered.length} of {wos.length} · click a row for quantities and deliveries</span>}
      />
    </div>
  );
}
