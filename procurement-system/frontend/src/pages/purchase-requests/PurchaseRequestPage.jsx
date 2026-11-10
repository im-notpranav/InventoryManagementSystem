import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ShoppingCart, CalendarClock, Send, Check, ClipboardList, Download, Filter, Trash2, PackagePlus, FileSignature } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import RequestDetail from '../../components/order/RequestDetail';
import { ErrorNote, DeptBadge } from '../../components/order/OrderParts';
import {
  PageHeader, StatCard, DataTable, StatusBadge, Button, Modal, Field, Input, Select, SearchInput, FilterChips, FileDrop, useToast,
} from '../../components/ui';
import { fmtDate, dataOf, errMsg, downloadCsv } from '../../lib/utils';
import { statusMeta } from '../../lib/status';

const STATUS_OPTIONS = ['pending', 'approved', 'rfq_sent', 'wo_issued', 'in_delivery', 'completed', 'rejected'];
const IN_PROGRESS = ['approved', 'rfq_sent', 'wo_issued', 'in_delivery'];
const itemsText = (r) => (r.items || []).map((i) => `${i.product?.name} ×${i.quantity}`).join(', ');

export default function PurchaseRequestPage() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.status || 'all');
  const [createOpen, setCreateOpen] = useState(!!location.state?.create);
  const [prefill, setPrefill] = useState(location.state?.prefill || null);
  const openId = params.get('id');

  // Dashboard / assistant hand-offs arrive as router state: { create, prefill, status }.
  useEffect(() => {
    const st = location.state;
    if (!st) return;
    if (st.create) { setPrefill(st.prefill || null); setCreateOpen(true); }
    if (st.status) setStatusFilter(st.status);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    const [pr, prod] = await Promise.allSettled([api.get('/purchase-requests'), api.get('/products')]);
    setRequests(pr.status === 'fulfilled' ? dataOf(pr.value) : []);
    setProducts(prod.status === 'fulfilled' ? dataOf(prod.value) : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: requests.length };
    requests.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter === 'in_progress' ? !IN_PROGRESS.includes(r.status) : statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.pr_number, itemsText(r), r.user?.department, r.user?.name].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [requests, search, statusFilter]);

  const exportCsv = () =>
    downloadCsv('purchase-requests.csv', ['Request', 'Items', 'Requester', 'Department', 'Status', 'Required by', 'Raised'],
      filtered.map((r) => [r.pr_number, itemsText(r), r.user?.name, r.user?.department, statusMeta(r.status).label, r.required_date, r.requested_at]));

  const columns = [
    { key: 'pr_number', header: 'Request', render: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{r.pr_number || `#${r.request_id}`}</span> },
    { key: 'items', header: 'Items', sortValue: itemsText, render: (r) => <span className="text-slate-700 cell-text block">{itemsText(r) || '—'}</span> },
    ...(isAdmin ? [{ key: 'dept', header: 'Requester', hideBelow: 'lg', sortValue: (r) => r.user?.name, render: (r) => (
      <div><p className="text-slate-700">{r.user?.name || '—'}</p><DeptBadge department={r.user?.department} className="mt-0.5" /></div>
    ) }] : []),
    { key: 'required_date', header: 'Required by', hideBelow: 'md', sortValue: (r) => (r.required_date ? new Date(r.required_date).getTime() : 0), render: (r) => <span className="text-xs text-slate-600">{fmtDate(r.required_date)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'requested_at', header: 'Raised', hideBelow: 'lg', sortValue: (r) => new Date(r.requested_at).getTime(), render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.requested_at)}</span> },
  ];

  const stats = [
    { label: 'Total requests', value: requests.length, icon: ClipboardList, tone: 'brand', key: 'all' },
    { label: isAdmin ? 'Waiting for you' : 'Pending approval', value: counts.pending || 0, icon: CalendarClock, tone: 'amber', key: 'pending' },
    { label: 'In procurement', value: IN_PROGRESS.reduce((s, k) => s + (counts[k] || 0), 0), icon: Send, tone: 'violet', key: 'in_progress' },
    { label: 'Completed', value: counts.completed || 0, icon: Check, tone: 'emerald', key: 'completed' },
  ];

  const openDetail = (r) => setParams((p) => { p.set('id', r.request_id); return p; });
  const closeDetail = () => setParams((p) => { p.delete('id'); return p; });

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Purchase Requests' : 'My Purchase Requests'}
        subtitle={isAdmin
          ? 'Approve your department’s requests, send them to vendors and pick the best quotation.'
          : 'Raise a request with the principal’s letter and follow it until the goods arrive.'}
        icon={ShoppingCart}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!filtered.length} className="hidden sm:inline-flex">Export</Button>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>New request</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} loading={loading} label={s.label} value={s.value} icon={s.icon} tone={s.tone} active={statusFilter === s.key} onClick={() => setStatusFilter(s.key)} />
        ))}
      </div>

      <div className="surface p-3 sm:p-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search request number, item, requester…" />
        <FilterChips
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: 'all', label: 'All', count: counts.all }, ...STATUS_OPTIONS.filter((s) => counts[s]).map((s) => ({ value: s, label: statusMeta(s).label, count: counts[s] }))]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="request_id"
        loading={loading}
        onRowClick={openDetail}
        emptyIcon={Filter}
        emptyTitle={requests.length ? 'No requests match these filters' : 'No purchase requests yet'}
        emptyDescription={requests.length ? 'Try a different status or clear the search.' : 'Keep the principal’s signed letter ready, then create a request.'}
        emptyAction={!requests.length && <Button icon={Plus} size="sm" onClick={() => setCreateOpen(true)}>New request</Button>}
        footer={<span>Showing {filtered.length} of {requests.length} · click a row for the full trail</span>}
      />

      <CreateRequestModal
        open={createOpen}
        prefill={prefill}
        onClose={() => { setCreateOpen(false); setPrefill(null); }}
        products={products}
        onCreated={() => { setCreateOpen(false); setPrefill(null); load(); }}
      />
      <RequestDetail requestId={openId} open={!!openId} onClose={closeDetail} onChanged={load} />
    </div>
  );
}

const blankItem = () => ({ key: Math.random().toString(36).slice(2), product_id: '', name: '', unit: 'piece', quantity: '1', notes: '', isNew: false });

function CreateRequestModal({ open, prefill, onClose, products, onCreated }) {
  const toast = useToast();
  const [items, setItems] = useState([blankItem()]);
  const [requiredDate, setRequiredDate] = useState('');
  const [letter, setLetter] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = blankItem();
    if (prefill?.product_id) {
      first.product_id = String(prefill.product_id);
      first.quantity = String(prefill.quantity || 1);
    }
    setItems([first]);
    setRequiredDate('');
    setLetter(null);
    setError('');
  }, [open, prefill]);

  const set = (key, patch) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const active = products.filter((p) => p.is_active !== false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!letter) return setError('Attach the principal’s signed letter.');
    if (!requiredDate) return setError('Set the required-by date.');
    for (const [n, i] of items.entries()) {
      if (i.isNew ? !i.name.trim() : !i.product_id) return setError(`Item ${n + 1}: pick a product or enter a new one.`);
      if (!(parseInt(i.quantity, 10) >= 1)) return setError(`Item ${n + 1}: quantity must be at least 1.`);
    }
    const fd = new FormData();
    fd.append('letter', letter);
    fd.append('required_date', requiredDate);
    fd.append('items', JSON.stringify(items.map((i) => ({
      ...(i.isNew ? { new_product: { name: i.name.trim(), unit: i.unit.trim() || 'piece' } } : { product_id: Number(i.product_id) }),
      quantity: Number(i.quantity),
      notes: i.notes.trim() || undefined,
    }))));
    setSaving(true);
    try {
      const res = await api.post('/purchase-requests', fd);
      toast.success(res.data?.message || 'Request submitted', { title: 'Sent to your HOD' });
      onCreated();
    } catch (err) {
      setError(errMsg(err, 'Failed to submit request'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={ShoppingCart}
      title="New purchase request"
      description="Your HOD gets it immediately. Vendors only see the items and specifications."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="new-pr" loading={saving} icon={Send}>Submit to HOD</Button>
        </>
      }
    >
      <form id="new-pr" onSubmit={submit} className="space-y-5">
        <ErrorNote>{error}</ErrorNote>

        <div className="space-y-3">
          {items.map((i, n) => (
            <div key={i.key} className="rounded-xl border border-slate-200 bg-surface p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Item {n + 1}</p>
                <div className="flex gap-1">
                  <Button size="xs" variant="ghost" icon={PackagePlus} onClick={() => set(i.key, { isNew: !i.isNew })}>
                    {i.isNew ? 'Pick from catalogue' : 'Not in catalogue?'}
                  </Button>
                  {items.length > 1 && <Button size="xs" variant="ghost" icon={Trash2} onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))} aria-label="Remove item" />}
                </div>
              </div>
              <div className="grid sm:grid-cols-[1fr_110px] gap-3">
                {i.isNew ? (
                  <div className="grid grid-cols-[1fr_100px] gap-3">
                    <Field label="Item name" required><Input value={i.name} onChange={(e) => set(i.key, { name: e.target.value })} placeholder="e.g. Oscilloscope 100 MHz" /></Field>
                    <Field label="Unit"><Input value={i.unit} onChange={(e) => set(i.key, { unit: e.target.value })} /></Field>
                  </div>
                ) : (
                  <Field label="Product" required>
                    <Select value={i.product_id} onChange={(e) => set(i.key, { product_id: e.target.value })} placeholder="Select a product…">
                      {active.map((p) => <option key={p.product_id} value={p.product_id}>{p.name} ({p.unit})</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="Quantity" required><Input type="number" min="1" value={i.quantity} onChange={(e) => set(i.key, { quantity: e.target.value })} /></Field>
              </div>
              <Field label="Specification" hint="Optional — model, size, brand. Vendors see this.">
                <Input value={i.notes} onChange={(e) => set(i.key, { notes: e.target.value })} placeholder="e.g. i5, 16 GB RAM, 512 GB SSD" />
              </Field>
            </div>
          ))}
          <Button size="sm" variant="soft" icon={Plus} onClick={() => setItems((l) => [...l, blankItem()])}>Add another item</Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Required by" required>
            <Input type="date" min={new Date().toISOString().slice(0, 10)} value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
          </Field>
          <Field label="Principal’s signed letter" required>
            <FileDrop file={letter} onChange={setLetter} accept=".pdf,.jpg,.jpeg,.png" label="Upload the letter (PDF or photo)" compact />
          </Field>
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1.5"><FileSignature className="w-3.5 h-3.5" /> The letter is your justification — no other cost or budget fields are needed.</p>
      </form>
    </Modal>
  );
}
