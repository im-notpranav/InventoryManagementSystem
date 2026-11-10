// HOD view of the quotation stage: approved requests waiting for an RFQ, and
// open RFQs collecting vendor quotes. Everything else happens in RequestDetail.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Send, Inbox, Timer, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import RequestDetail from '../../components/order/RequestDetail';
import { DeptBadge } from '../../components/order/OrderParts';
import { PageHeader, StatCard, DataTable, StatusBadge, Badge, Tabs } from '../../components/ui';
import { fmtDate, dataOf } from '../../lib/utils';

const itemsText = (r) => (r.items || []).map((i) => `${i.product?.name} ×${i.quantity}`).join(', ');
const isClosed = (r) => r.rfq_closes_at && new Date(r.rfq_closes_at) <= new Date();
const allQuoted = (r) => r._count?.vendor_rfqs > 0 && r._count.quote_submissions >= r._count.vendor_rfqs;

export default function QuotationsPage() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');
  const openId = params.get('id');

  const load = async () => {
    setLoading(true);
    try {
      setRows(dataOf(await api.get('/purchase-requests', { params: { status: 'approved,rfq_sent' } })));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const sent = rows.filter((r) => r.status === 'rfq_sent');
    return {
      to_send: rows.filter((r) => r.status === 'approved'),
      open: sent.filter((r) => !isClosed(r) && !allQuoted(r)),
      ready: sent.filter((r) => isClosed(r) || allQuoted(r)),
    };
  }, [rows]);

  const columns = [
    { key: 'pr_number', header: 'Request', render: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{r.pr_number}</span> },
    { key: 'items', header: 'Items', sortValue: itemsText, render: (r) => <span className="text-slate-700 cell-text block">{itemsText(r)}</span> },
    { key: 'dept', header: 'Department', hideBelow: 'lg', sortValue: (r) => r.user?.department, render: (r) => <DeptBadge department={r.user?.department} /> },
    {
      key: 'quotes', header: 'Quotes', sortValue: (r) => r._count?.quote_submissions || 0,
      render: (r) => (r.status === 'approved'
        ? <span className="text-xs text-slate-400">Not sent</span>
        : <span className="tabular text-sm text-slate-800">{r._count?.quote_submissions || 0}<span className="text-slate-400"> / {r._count?.vendor_rfqs || 0}</span></span>),
    },
    {
      key: 'closes', header: 'Closes', hideBelow: 'md', sortValue: (r) => (r.rfq_closes_at ? new Date(r.rfq_closes_at).getTime() : 0),
      render: (r) => (!r.rfq_closes_at ? <span className="text-xs text-slate-400">—</span>
        : isClosed(r) ? <Badge tone="emerald" size="xs">Closed {fmtDate(r.rfq_closes_at)}</Badge>
          : <span className="text-xs text-slate-600">{fmtDate(r.rfq_closes_at)}</span>),
    },
    { key: 'required_date', header: 'Required by', hideBelow: 'lg', render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.required_date)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const empty = {
    to_send: ['No approved requests waiting', 'Approve a request to start the quotation stage.'],
    open: ['No RFQs collecting quotes', 'Requests appear here after you send them to vendors.'],
    ready: ['Nothing ready to select', 'A request is ready once its closing date passes or every invited vendor has quoted.'],
  }[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        subtitle="Send approved requests to vendors, compare their quotes and pick one. The work order is created automatically."
        icon={FileText}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard index={0} loading={loading} label="Ready to send" value={groups.to_send.length} icon={Send} tone="blue" active={tab === 'to_send'} onClick={() => setTab('to_send')} />
        <StatCard index={1} loading={loading} label="Collecting quotes" value={groups.open.length} icon={Timer} tone="violet" active={tab === 'open'} onClick={() => setTab('open')} />
        <StatCard index={2} loading={loading} label="Ready to select" value={groups.ready.length} icon={CheckCircle2} tone="emerald" active={tab === 'ready'} onClick={() => setTab('ready')} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'to_send', label: `Ready to send (${groups.to_send.length})` },
          { key: 'open', label: `Collecting (${groups.open.length})` },
          { key: 'ready', label: `Ready to select (${groups.ready.length})` },
        ]}
      />

      <DataTable
        columns={columns}
        rows={groups[tab]}
        rowKey="request_id"
        loading={loading}
        onRowClick={(r) => setParams((p) => { p.set('id', r.request_id); return p; })}
        emptyIcon={Inbox}
        emptyTitle={empty[0]}
        emptyDescription={empty[1]}
        footer={<span>Click a row to send the RFQ, compare quotes or select a vendor</span>}
      />

      <RequestDetail requestId={openId} open={!!openId} onClose={() => setParams((p) => { p.delete('id'); return p; })} onChanged={load} />
    </div>
  );
}
