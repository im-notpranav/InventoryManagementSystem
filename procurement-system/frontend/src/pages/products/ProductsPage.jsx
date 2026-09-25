import { useEffect, useMemo, useState } from 'react';
import { Tag, Plus, Boxes, Layers, CheckCircle2, IndianRupee, Download, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { PageHeader, StatCard, DataTable, Button, Modal, Field, Input, Select, Textarea, SearchInput, FilterChips, StatusBadge, KV, useToast, ErrorState } from '../../components/ui';
import { fmtINR, dataOf, errMsg, downloadCsv, hueFor } from '../../lib/utils';

const EMPTY = { name: '', sku: '', category_id: '', unit: 'piece', unit_price: '', description: '' };

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.allSettled([api.get('/products'), api.get('/categories')]);
      if (p.status === 'rejected') throw p.reason;
      setProducts(dataOf(p.value));
      setCategories(c.status === 'fulfilled' ? dataOf(c.value) : []);
    } catch (e) {
      setError(errMsg(e, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const catCounts = useMemo(() => {
    const c = {};
    products.forEach((p) => {
      const k = p.category?.name || 'Uncategorised';
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== 'all' && (p.category?.name || 'Uncategorised') !== catFilter) return false;
      if (!q) return true;
      return [p.name, p.sku, p.description, p.category?.name].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [products, search, catFilter]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/products', { ...form, unit_price: form.unit_price === '' ? 0 : parseFloat(form.unit_price) });
      toast.success(`${form.name} added to the catalogue`);
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to create product'));
    } finally {
      setSaving(false);
    }
  };

  const active = products.filter((p) => p.is_active).length;
  const avgPrice = products.length ? products.reduce((a, p) => a + Number(p.unit_price || 0), 0) / products.length : 0;

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => {
        const h = hueFor(p.category?.name || p.name);
        return (
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 45% 35%)` }}>
              <Tag className="w-4 h-4" />
            </span>
            <div className="min-w-0 cell-text">
              <p className="font-medium text-slate-800">{p.name}</p>
              {p.description && <p className="text-[11px] text-slate-400">{p.description}</p>}
            </div>
          </div>
        );
      },
    },
    { key: 'sku', header: 'SKU', hideBelow: 'md', render: (p) => <span className="font-mono text-xs text-slate-600">{p.sku}</span> },
    { key: 'category', header: 'Category', hideBelow: 'md', sortValue: (p) => p.category?.name, render: (p) => <span className="text-slate-600">{p.category?.name || '—'}</span> },
    { key: 'unit', header: 'Unit', hideBelow: 'lg', render: (p) => <span className="text-slate-500 capitalize">{p.unit}</span> },
    { key: 'unit_price', header: 'Unit price', align: 'right', sortValue: (p) => Number(p.unit_price || 0), render: (p) => <span className="tabular font-medium text-slate-800">{fmtINR(p.unit_price, { decimals: true })}</span> },
    { key: 'is_active', header: 'Status', render: (p) => <StatusBadge status={p.is_active ? 'active' : 'inactive'} pulse={false} /> },
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="The catalogue departments raise requests against. Items created via new-item requests land here for review."
        icon={Boxes}
        actions={
          <>
            <Button variant="secondary" icon={Download} disabled={!filtered.length} onClick={() => downloadCsv('products.csv', ['Name', 'SKU', 'Category', 'Unit', 'Unit Price', 'Active'], filtered.map((p) => [p.name, p.sku, p.category?.name, p.unit, p.unit_price, p.is_active ? 'Yes' : 'No']))}>
              Export
            </Button>
            {isAdmin && <Button icon={Plus} onClick={() => setOpen(true)}>Add product</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Catalogue items" value={products.length} icon={Boxes} tone="brand" />
        <StatCard index={1} loading={loading} label="Active" value={active} icon={CheckCircle2} tone="emerald" />
        <StatCard index={2} loading={loading} label="Categories" value={Object.keys(catCounts).length} icon={Layers} tone="violet" />
        <StatCard index={3} loading={loading} label="Avg. unit price" value={fmtINR(avgPrice)} icon={IndianRupee} tone="amber" />
      </div>

      <div className="surface p-3 sm:p-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, SKU, description…" />
        <FilterChips value={catFilter} onChange={setCatFilter} options={[{ value: 'all', label: 'All categories', count: products.length }, ...Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ value: k, label: k, count: v }))]} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="product_id"
        loading={loading}
        emptyIcon={Filter}
        emptyTitle={products.length ? 'No products match' : 'Catalogue is empty'}
        emptyDescription={products.length ? 'Try another category or search term.' : 'Add your first product to get started.'}
        footer={<span>Showing {filtered.length} of {products.length}</span>}
        expandable={(p) => (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KV label="Description" value={p.description || 'No description'} className="col-span-2" />
            <KV label="SKU" value={p.sku} mono />
            <KV label="Category" value={p.category?.name || '—'} />
            <KV label="Unit" value={p.unit} />
            <KV label="Unit price" value={fmtINR(p.unit_price, { decimals: true })} />
            <KV label="Created" value={p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'} />
          </div>
        )}
      />

      <Modal open={open} onClose={() => setOpen(false)} icon={Plus} title="Add product" description="Create a catalogue item departments can request." footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-product" loading={saving}>Create product</Button>
        </>
      }>
        <form id="add-product" onSubmit={submit} className="space-y-4">
          <Field label="Product name" required>
            <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ergonomic office chair" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" hint="Auto-generated if blank">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Optional" mono />
            </Field>
            <Field label="Category" required>
              <Select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} placeholder="Select…">
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Unit">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {['piece', 'box', 'set', 'kg', 'litre', 'metre', 'other'].map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Unit price (₹)">
              <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Specs, model, or notes for requesters" rows={3} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
