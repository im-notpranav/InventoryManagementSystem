import { useEffect, useMemo, useState } from 'react';
import { FileText, IndianRupee, Truck, Clock, CheckCircle2, Download, Filter } from 'lucide-react';
import api from '../../api/axios';
import { PageHeader, StatCard, DataTable, SearchInput, FilterChips, StatusBadge, KV, Avatar, Button, ErrorState } from '../../components/ui';
import { fmtINR, fmtDate, fmtDateTime, dataOf, errMsg, downloadCsv } from '../../lib/utils';
import { statusMeta } from '../../lib/status';

export default function PurchaseOrderPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/purchase-orders');
      setOrders(dataOf(r));
    } catch (e) {
      setError(errMsg(e, 'Failed to load purchase orders'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: orders.length };
    orders.forEach((o) => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (!q) return true;
      return [o.po_number, o.vendor?.vendor_name, o.status].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [orders, search, status]);

  const total = orders.reduce((a, o) => a + Number(o.total_amount || 0), 0);

  const columns = [
    { key: 'po_number', header: 'PO number', render: (o) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{o.po_number}</span> },
    { key: 'vendor', header: 'Vendor', sortValue: (o) => o.vendor?.vendor_name, render: (o) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={o.vendor?.vendor_name} size="sm" />
        <span className="font-medium text-slate-800">{o.vendor?.vendor_name || '—'}</span>
      </div>
    ) },
    { key: 'items', header: 'Items', hideBelow: 'md', sortable: false, render: (o) => <span className="text-slate-600">{o.items?.length ?? o.order_items?.length ?? '—'}</span> },
    { key: 'total_amount', header: 'Amount', align: 'right', sortValue: (o) => Number(o.total_amount || 0), render: (o) => <span className="tabular font-semibold text-slate-900">{fmtINR(o.total_amount)}</span> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'order_date', header: 'Ordered', hideBelow: 'lg', sortValue: (o) => new Date(o.order_date).getTime(), render: (o) => <span className="text-xs text-slate-500">{fmtDate(o.order_date)}</span> },
    { key: 'expected_delivery', header: 'Expected', hideBelow: 'lg', render: (o) => <span className="text-xs text-slate-500">{o.expected_delivery ? fmtDate(o.expected_delivery) : '—'}</span> },
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="The PO register — one record per confirmed order, with vendor, value and delivery status."
        icon={FileText}
        actions={<Button variant="secondary" icon={Download} disabled={!filtered.length} onClick={() => downloadCsv('purchase-orders.csv', ['PO Number', 'Vendor', 'Amount', 'Status', 'Order Date', 'Expected Delivery'], filtered.map((o) => [o.po_number, o.vendor?.vendor_name, o.total_amount, o.status, o.order_date, o.expected_delivery]))}>Export</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Purchase orders" value={orders.length} icon={FileText} tone="brand" active={status === 'all'} onClick={() => setStatus('all')} />
        <StatCard index={1} loading={loading} label="Total value" value={fmtINR(total)} icon={IndianRupee} tone="emerald" />
        <StatCard index={2} loading={loading} label="Open" value={(counts.pending || 0) + (counts.sent || 0) + (counts.approved || 0) + (counts.partial || 0)} icon={Clock} tone="amber" />
        <StatCard index={3} loading={loading} label="Received" value={(counts.received || 0) + (counts.completed || 0)} icon={CheckCircle2} tone="violet" />
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search PO number or vendor…" className="flex-1" />
        <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All', count: counts.all }, ...Object.keys(counts).filter((k) => k !== 'all').map((k) => ({ value: k, label: statusMeta(k).label, count: counts[k] }))]} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="order_id"
        loading={loading}
        emptyIcon={orders.length ? Filter : Truck}
        emptyTitle={orders.length ? 'No orders match' : 'No purchase orders yet'}
        emptyDescription={orders.length ? 'Adjust the filters.' : 'Purchase orders are generated from approved requests and vendor selections.'}
        footer={<span>{filtered.length} of {orders.length}</span>}
        expandable={(o) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KV label="Created by" value={o.creator?.name || o.created_by_user?.name || '—'} />
              <KV label="Ordered" value={fmtDateTime(o.order_date)} />
              <KV label="Expected delivery" value={o.expected_delivery ? fmtDate(o.expected_delivery) : '—'} />
              <KV label="Linked request" value={o.request?.pr_number || '—'} mono />
            </div>
            {(o.items || o.order_items)?.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="ui-table">
                  <thead><tr><th className="!static">Product</th><th className="!static text-right">Qty</th><th className="!static text-right">Unit price</th><th className="!static text-right">Line total</th></tr></thead>
                  <tbody>
                    {(o.items || o.order_items).map((it, i) => (
                      <tr key={it.item_id || i}>
                        <td>{it.product?.name || it.description || '—'}</td>
                        <td className="text-right tabular">{it.quantity}</td>
                        <td className="text-right tabular">{fmtINR(it.unit_price)}</td>
                        <td className="text-right tabular font-medium">{fmtINR(Number(it.unit_price || 0) * Number(it.quantity || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {o.notes && <p className="text-sm text-slate-600"><span className="font-semibold">Notes:</span> {o.notes}</p>}
          </div>
        )}
      />
    </div>
  );
}
