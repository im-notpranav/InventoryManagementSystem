import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Download, Package, Boxes, AlertTriangle, IndianRupee, Warehouse, TrendingDown, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  PageHeader, StatCard, DataTable, Button, Modal, Field, Input, Select, SearchInput, FilterChips, KV, Progress, Badge, useToast, ErrorState,
} from '../../components/ui';
import { fmtINR, fmtDateTime, dataOf, errMsg, downloadCsv, cn } from '../../lib/utils';

const rowStatus = (r) => (r.quantity_available <= 0 ? 'out' : r.quantity_available <= r.reorder_point ? 'low' : 'ok');
const STATUS_TONE = { out: 'red', low: 'amber', ok: 'emerald' };
const STATUS_LABEL = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' };

const EMPTY_ADD = { product_id: '', warehouse_id: '', quantity_available: 0, reorder_point: 5, min_stock: 0, max_stock: 9999 };

export default function Inventory() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.status || 'all');

  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, sum, wh, pr] = await Promise.allSettled([api.get('/inventory'), api.get('/inventory/summary'), api.get('/warehouses'), api.get('/products')]);
      if (inv.status === 'rejected') throw inv.reason;
      setRows(dataOf(inv.value));
      setSummary(sum.status === 'fulfilled' ? dataOf(sum.value, null) : null);
      setWarehouses(wh.status === 'fulfilled' ? dataOf(wh.value) : []);
      setProducts(pr.status === 'fulfilled' ? dataOf(pr.value) : []);
    } catch (e) {
      setError(errMsg(e, 'Failed to load inventory'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: rows.length, low: 0, out: 0, ok: 0 };
    rows.forEach((r) => {
      c[rowStatus(r)] += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (whFilter && String(r.warehouse_id) !== whFilter) return false;
      if (statusFilter !== 'all' && rowStatus(r) !== statusFilter) return false;
      if (!q) return true;
      return [r.product?.name, r.product?.sku, r.product?.category?.name, r.warehouse?.name].some((v) => String(v || '').toLowerCase().includes(q));
    });
    const rank = { out: 0, low: 1, ok: 2 };
    return list.sort((a, b) => rank[rowStatus(a)] - rank[rowStatus(b)] || String(a.product?.name || '').localeCompare(b.product?.name || ''));
  }, [rows, search, whFilter, statusFilter]);

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      await api.put(`/inventory/${editRow.inventory_id}`, {
        quantity_available: editRow.quantity_available,
        reorder_point: editRow.reorder_point,
        min_stock: editRow.min_stock,
        max_stock: editRow.max_stock,
      });
      toast.success(`${editRow.product?.name || 'Stock'} updated`);
      setEditRow(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inventory', addForm);
      toast.success('Inventory row added');
      setAddOpen(false);
      setAddForm(EMPTY_ADD);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to add inventory row'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      'inventory.csv',
      ['Product', 'SKU', 'Category', 'Warehouse', 'Qty', 'Reorder', 'Min', 'Max', 'Unit Price', 'Total Value', 'Status'],
      filtered.map((r) => [r.product?.name, r.product?.sku, r.product?.category?.name, r.warehouse?.name, r.quantity_available, r.reorder_point, r.min_stock, r.max_stock, r.product?.unit_price, Number(r.product?.unit_price || 0) * (r.quantity_available || 0), STATUS_LABEL[rowStatus(r)]]),
    );

  const s = summary || {};
  const totalValue = s.total_value != null ? Number(s.total_value) : rows.reduce((acc, r) => acc + Number(r.product?.unit_price || 0) * (r.quantity_available || 0), 0);

  const columns = [
    {
      key: 'product',
      header: 'Product',
      sortValue: (r) => r.product?.name,
      render: (r) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0', { out: 'bg-red-50 text-red-600', low: 'bg-amber-50 text-amber-600', ok: 'bg-slate-100 text-slate-500' }[rowStatus(r)])}>
            <Package className="w-4 h-4" />
          </span>
          <div className="min-w-0 cell-text">
            <p className="font-medium text-slate-800">{r.product?.name}</p>
            <p className="text-[11px] text-slate-400"><span className="font-mono">{r.product?.sku}</span>{r.product?.category?.name ? ` · ${r.product.category.name}` : ''}</p>
          </div>
        </div>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', hideBelow: 'md', sortValue: (r) => r.warehouse?.name, render: (r) => <span className="text-slate-600">{r.warehouse?.name || '—'}</span> },
    {
      key: 'quantity_available',
      header: 'Stock level',
      sortValue: (r) => r.quantity_available,
      render: (r) => {
        const max = Math.max(r.max_stock || 0, r.reorder_point * 2, r.quantity_available, 1);
        const pct = (r.quantity_available / max) * 100;
        const st = rowStatus(r);
        return (
          <div className="min-w-[92px]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-semibold text-slate-900 tabular">{r.quantity_available}</span>
              <span className="cq-wide-only text-[11px] text-slate-400 tabular">reorder at {r.reorder_point}</span>
            </div>
            <Progress value={pct} tone={STATUS_TONE[st]} size="sm" />
          </div>
        );
      },
    },
    { key: 'minmax', header: 'Min / Max', hideBelow: 'lg', sortable: false, render: (r) => <span className="text-xs text-slate-500 tabular">{r.min_stock} / {r.max_stock}</span> },
    { key: 'status', header: 'Status', hideBelow: 'md', render: (r) => { const st = rowStatus(r); return <Badge tone={STATUS_TONE[st]} dot pulse={st === 'out'}>{STATUS_LABEL[st]}</Badge>; } },
    { key: 'unit_price', header: 'Unit price', align: 'right', hideBelow: 'lg', sortValue: (r) => Number(r.product?.unit_price || 0), render: (r) => <span className="tabular text-slate-600">{fmtINR(r.product?.unit_price)}</span> },
    { key: 'value', header: 'Value', align: 'right', hideBelow: 'md', sortValue: (r) => Number(r.product?.unit_price || 0) * (r.quantity_available || 0), render: (r) => <span className="tabular font-medium text-slate-800">{fmtINR(Number(r.product?.unit_price || 0) * (r.quantity_available || 0))}</span> },
    ...(isAdmin
      ? [{ key: 'actions', header: '', sortable: false, align: 'right', hideBelow: 'md', render: (r) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button size="xs" variant="secondary" icon={Pencil} onClick={() => setEditRow({ ...r })}>Adjust</Button>
          </div>
        ) }]
      : []),
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Live stock levels across warehouses. Rows at or below their reorder point float to the top."
        icon={Boxes}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button>
            {isAdmin && <Button icon={Plus} onClick={() => setAddOpen(true)}>Add stock row</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Tracked products" value={s.total_products ?? rows.length} icon={Package} tone="brand" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <StatCard index={1} loading={loading} label="Inventory value" value={fmtINR(totalValue)} icon={IndianRupee} tone="emerald" />
        <StatCard index={2} loading={loading} label="Low stock" value={s.low_stock_count ?? counts.low} icon={TrendingDown} tone="amber" active={statusFilter === 'low'} onClick={() => setStatusFilter('low')} hint="At or below reorder point" />
        <StatCard index={3} loading={loading} label="Out of stock" value={s.out_of_stock_count ?? counts.out} icon={AlertTriangle} tone="red" active={statusFilter === 'out'} onClick={() => setStatusFilter('out')} />
      </div>

      <div className="surface p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search product, SKU, category…" className="flex-1" />
          <Select value={whFilter} onChange={(e) => setWhFilter(e.target.value)} className="sm:!w-56 !bg-white" placeholder="All warehouses">
            {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
          </Select>
        </div>
        <FilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'out', label: 'Out of stock', count: counts.out, dot: 'bg-red-500' },
            { value: 'low', label: 'Low stock', count: counts.low, dot: 'bg-amber-500' },
            { value: 'ok', label: 'Healthy', count: counts.ok, dot: 'bg-emerald-500' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="inventory_id"
        loading={loading}
        emptyIcon={Filter}
        emptyTitle={rows.length ? 'No rows match these filters' : 'No inventory tracked yet'}
        emptyDescription={rows.length ? 'Adjust the status or warehouse filter.' : isAdmin ? 'Add a stock row to start tracking a product in a warehouse.' : 'Ask an admin to add stock rows.'}
        footer={<span>Showing {filtered.length} of {rows.length} · {counts.low} low · {counts.out} out</span>}
        rowClassName={(r) => (rowStatus(r) === 'out' ? 'bg-red-50/30' : rowStatus(r) === 'low' ? 'bg-amber-50/30' : '')}
        expandable={(r) => (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KV label="Description" value={r.product?.description || 'No description'} className="col-span-2" />
            <KV label="Unit" value={r.product?.unit || '—'} />
            <KV label="Last updated" value={fmtDateTime(r.last_updated)} />
            <KV label="Warehouse" value={`${r.warehouse?.name || '—'}${r.warehouse?.location ? ` · ${r.warehouse.location}` : ''}`} />
            <KV label="Reorder point" value={r.reorder_point} />
            <KV label="Min stock" value={r.min_stock} />
            <KV label="Max stock" value={r.max_stock} />
          </div>
        )}
      />

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} icon={Warehouse} title="Add stock row" description="Track a catalogue product in a warehouse." footer={
        <>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-inventory" loading={saving}>Add row</Button>
        </>
      }>
        <form id="add-inventory" onSubmit={submitAdd} className="space-y-4">
          <Field label="Product" required>
            <Select required value={addForm.product_id} onChange={(e) => setAddForm({ ...addForm, product_id: e.target.value })} placeholder="Select product…">
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name} ({p.sku})</option>)}
            </Select>
          </Field>
          <Field label="Warehouse" required>
            <Select required value={addForm.warehouse_id} onChange={(e) => setAddForm({ ...addForm, warehouse_id: e.target.value })} placeholder="Select warehouse…">
              {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opening quantity"><Input type="number" min="0" value={addForm.quantity_available} onChange={(e) => setAddForm({ ...addForm, quantity_available: +e.target.value })} /></Field>
            <Field label="Reorder point" hint="Alerts trigger at or below this"><Input type="number" min="0" value={addForm.reorder_point} onChange={(e) => setAddForm({ ...addForm, reorder_point: +e.target.value })} /></Field>
            <Field label="Min stock"><Input type="number" min="0" value={addForm.min_stock} onChange={(e) => setAddForm({ ...addForm, min_stock: +e.target.value })} /></Field>
            <Field label="Max stock"><Input type="number" min="0" value={addForm.max_stock} onChange={(e) => setAddForm({ ...addForm, max_stock: +e.target.value })} /></Field>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} icon={Pencil} title="Adjust stock" description={editRow ? `${editRow.product?.name} · ${editRow.warehouse?.name}` : ''} footer={
        <>
          <Button variant="secondary" onClick={() => setEditRow(null)}>Cancel</Button>
          <Button loading={saving} onClick={saveEdit}>Save changes</Button>
        </>
      }>
        {editRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity on hand"><Input type="number" min="0" autoFocus value={editRow.quantity_available} onChange={(e) => setEditRow({ ...editRow, quantity_available: +e.target.value })} /></Field>
              <Field label="Reorder point"><Input type="number" min="0" value={editRow.reorder_point} onChange={(e) => setEditRow({ ...editRow, reorder_point: +e.target.value })} /></Field>
              <Field label="Min stock"><Input type="number" min="0" value={editRow.min_stock} onChange={(e) => setEditRow({ ...editRow, min_stock: +e.target.value })} /></Field>
              <Field label="Max stock"><Input type="number" min="0" value={editRow.max_stock} onChange={(e) => setEditRow({ ...editRow, max_stock: +e.target.value })} /></Field>
            </div>
            <div className={cn('rounded-xl border px-3.5 py-2.5 text-sm flex items-center gap-2', rowStatus(editRow) === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800')}>
              <AlertTriangle className="w-4 h-4" />
              After saving this row will be <strong className="ml-1">{STATUS_LABEL[rowStatus(editRow)].toLowerCase()}</strong>.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
