import { useEffect, useMemo, useState } from 'react';
import { Plus, ClipboardList, Truck, Clock, CheckCircle2, IndianRupee, FileText, ExternalLink, Filter, Sparkles, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { PageHeader, StatCard, DataTable, Button, Modal, Field, Input, Select, Textarea, SearchInput, FilterChips, StatusBadge, KV, Avatar, useToast, ErrorState, Badge } from '../../components/ui';
import { fmtINR, fmtDate, fmtDateTime, fileUrl, dataOf, errMsg, daysUntil, cn } from '../../lib/utils';
import { statusMeta } from '../../lib/status';

const EMPTY = { submission_id: '', items_description: '', quantity: '', agreed_price: '', delivery_deadline: '', terms: '' };
const STATUSES = ['issued', 'acknowledged', 'dispatched', 'completed', 'draft'];

export default function WorkOrders() {
  const toast = useToast();
  const [wos, setWos] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wo, sub] = await Promise.allSettled([api.get('/work-orders'), api.get('/quotations')]);
      if (wo.status === 'rejected') throw wo.reason;
      setWos(dataOf(wo.value));
      setSubmissions(sub.status === 'fulfilled' ? dataOf(sub.value).filter((s) => s.status === 'approved') : []);
    } catch (e) {
      setError(errMsg(e, 'Failed to load work orders'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const usedSubmissionIds = useMemo(() => new Set(wos.map((w) => w.submission_id).filter(Boolean)), [wos]);
  const availableSubs = submissions.filter((s) => !usedSubmissionIds.has(s.submission_id));

  const counts = useMemo(() => {
    const c = { all: wos.length };
    wos.forEach((w) => {
      c[w.status] = (c[w.status] || 0) + 1;
    });
    return c;
  }, [wos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wos.filter((w) => {
      if (status !== 'all' && w.status !== status) return false;
      if (!q) return true;
      return [w.wo_number, w.vendor?.vendor_name, w.items_description, w.tax_invoice_number].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [wos, search, status]);

  const totalValue = wos.reduce((a, w) => a + Number(w.agreed_price || 0), 0);

  const pickSubmission = (id) => {
    const s = submissions.find((x) => String(x.submission_id) === String(id));
    if (!s) return setForm({ ...form, submission_id: id });
    setForm({
      ...form,
      submission_id: id,
      items_description: form.items_description || s.request?.product?.name || '',
      quantity: form.quantity || String(s.quoted_quantity || s.request?.quantity || ''),
      agreed_price: form.agreed_price || String(s.quoted_price || ''),
      delivery_deadline: form.delivery_deadline || (s.request?.required_date ? String(s.request.required_date).slice(0, 10) : ''),
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.submission_id) return setFormError('Select an approved quotation');
    if (!form.items_description.trim()) return setFormError('Items description is required');
    if (!form.quantity || parseInt(form.quantity, 10) < 1) return setFormError('Quantity must be at least 1');
    if (!form.agreed_price || parseFloat(form.agreed_price) <= 0) return setFormError('Agreed price must be greater than 0');
    if (!form.delivery_deadline) return setFormError('Delivery deadline is required');
    setSaving(true);
    try {
      const res = await api.post('/work-orders/create', {
        submission_id: parseInt(form.submission_id, 10),
        items_description: form.items_description.trim(),
        quantity: parseInt(form.quantity, 10),
        agreed_price: parseFloat(form.agreed_price),
        delivery_deadline: form.delivery_deadline,
        terms: form.terms?.trim() || null,
      });
      const woNumber = res.data?.data?.wo_number || res.data?.wo_number || 'Work order';
      toast.success(`${woNumber} issued to vendor`, { title: 'Work order created' });
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormError(errMsg(err, 'Failed to create work order'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'wo_number', header: 'Work order', render: (w) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{w.wo_number}</span> },
    { key: 'vendor', header: 'Vendor', sortValue: (w) => w.vendor?.vendor_name, render: (w) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={w.vendor?.vendor_name} size="sm" />
        <span className="text-slate-800 font-medium cell-text">{w.vendor?.vendor_name || '—'}</span>
      </div>
    ) },
    { key: 'items_description', header: 'Items', hideBelow: 'md', render: (w) => <span className="text-slate-600 cell-text block">{w.items_description}</span> },
    { key: 'quantity', header: 'Qty', align: 'right', hideBelow: 'md', render: (w) => <span className="tabular">{w.quantity}</span> },
    { key: 'agreed_price', header: 'Value', align: 'right', hideBelow: 'md', sortValue: (w) => Number(w.agreed_price || 0), render: (w) => <span className="tabular font-semibold text-slate-900">{fmtINR(w.agreed_price)}</span> },
    {
      key: 'delivery_deadline',
      header: 'Deadline',
      hideBelow: 'lg',
      sortValue: (w) => (w.delivery_deadline ? new Date(w.delivery_deadline).getTime() : 0),
      render: (w) => {
        const d = daysUntil(w.delivery_deadline);
        const late = d != null && d < 0 && !['completed'].includes(w.status) && !w.gate_entry?.invoice_verified;
        return (
          <div>
            <p className={cn('text-xs', late ? 'text-red-600 font-semibold' : 'text-slate-600')}>{fmtDate(w.delivery_deadline)}</p>
            {d != null && w.status !== 'completed' && <p className={cn('text-[10px]', late ? 'text-red-500' : 'text-slate-400')}>{late ? `${Math.abs(d)}d overdue` : d === 0 ? 'due today' : `in ${d}d`}</p>}
          </div>
        );
      },
    },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={w.status} pulse={w.status === 'issued'} /> },
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Issued against approved quotations. Vendors acknowledge, dispatch with a tax invoice, and Security verifies at the gate."
        icon={ClipboardList}
        actions={<Button icon={Plus} onClick={() => { setForm(EMPTY); setFormError(''); setOpen(true); }}>Create work order</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Total work orders" value={wos.length} icon={ClipboardList} tone="brand" active={status === 'all'} onClick={() => setStatus('all')} />
        <StatCard index={1} loading={loading} label="Awaiting acknowledgment" value={counts.issued || 0} icon={Clock} tone="amber" active={status === 'issued'} onClick={() => setStatus('issued')} />
        <StatCard index={2} loading={loading} label="In transit" value={counts.dispatched || 0} icon={Truck} tone="violet" active={status === 'dispatched'} onClick={() => setStatus('dispatched')} />
        <StatCard index={3} loading={loading} label="Committed value" value={fmtINR(totalValue)} icon={IndianRupee} tone="emerald" />
      </div>

      {availableSubs.length > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white px-5 py-4 flex flex-wrap items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center"><Sparkles className="w-5 h-5" /></span>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-slate-900 text-sm">{availableSubs.length} approved quotation{availableSubs.length > 1 ? 's' : ''} ready for a work order</p>
            <p className="text-xs text-slate-500">{availableSubs.slice(0, 3).map((s) => `${s.request?.pr_number} · ${s.vendor?.vendor_name}`).join('  •  ')}</p>
          </div>
          <Button variant="violet" size="sm" icon={Plus} onClick={() => { setForm({ ...EMPTY }); pickSubmission(String(availableSubs[0].submission_id)); setOpen(true); }}>Issue now</Button>
        </div>
      )}

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search WO number, vendor, items, invoice…" className="flex-1" />
        <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All', count: counts.all }, ...STATUSES.filter((s) => counts[s]).map((s) => ({ value: s, label: statusMeta(s).label, count: counts[s] }))]} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="wo_id"
        loading={loading}
        emptyIcon={Filter}
        emptyTitle={wos.length ? 'No work orders match' : 'No work orders yet'}
        emptyDescription={wos.length ? 'Adjust the filters.' : 'Approve a vendor quotation first, then issue a work order against it.'}
        footer={<span>{filtered.length} of {wos.length} work orders</span>}
        expandable={(w) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <KV label="Issued" value={fmtDateTime(w.created_at)} />
              <KV label="Acknowledged" value={w.acknowledged_at ? fmtDateTime(w.acknowledged_at) : 'Pending'} />
              <KV label="Dispatched" value={w.dispatched_at ? fmtDateTime(w.dispatched_at) : '—'} />
              <KV label="Expected delivery" value={w.expected_delivery ? fmtDate(w.expected_delivery) : '—'} />
              <KV label="Tax invoice no." value={w.tax_invoice_number || '—'} mono />
              <KV label="Linked request" value={w.request?.pr_number || w.submission?.request?.pr_number || '—'} mono />
            </div>
            {w.terms && <div className="rounded-xl bg-white border border-slate-200 p-3.5"><p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-1">Terms</p><p className="text-sm text-slate-700">{w.terms}</p></div>}
            <div className="flex flex-wrap gap-2">
              {w.wo_file_url && <a href={fileUrl(w.wo_file_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"><FileText className="w-3.5 h-3.5" /> Work order PDF <ExternalLink className="w-3 h-3 opacity-60" /></a>}
              {w.tax_invoice_url && <a href={fileUrl(w.tax_invoice_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"><FileText className="w-3.5 h-3.5" /> Tax invoice <ExternalLink className="w-3 h-3 opacity-60" /></a>}
              {w.gate_entry && <Badge tone={w.gate_entry.invoice_verified ? 'emerald' : 'red'} dot>{w.gate_entry.invoice_verified ? `Gate verified · ${w.gate_entry.entry_number}` : 'Blocked at gate'}</Badge>}
            </div>
          </div>
        )}
      />

      <Modal open={open} onClose={() => setOpen(false)} size="lg" icon={ClipboardList} title="Create work order" description="Pick an approved quotation — the details auto-fill from the vendor's quote." footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-wo" loading={saving} icon={CheckCircle2}>Create &amp; issue</Button>
        </>
      }>
        <form id="create-wo" onSubmit={submit} className="space-y-4">
          {formError && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3.5 py-2.5 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{formError}</div>}
          <Field label="Approved quotation" required hint={availableSubs.length === 0 ? 'No unused approved quotations. Approve one under Quotations first.' : undefined}>
            <Select required value={form.submission_id} onChange={(e) => pickSubmission(e.target.value)} placeholder="Select an approved quotation…">
              {availableSubs.map((s) => <option key={s.submission_id} value={s.submission_id}>{s.request?.pr_number} — {s.vendor?.vendor_name} — {fmtINR(s.quoted_price)} ({s.request?.product?.name})</option>)}
              {submissions.filter((s) => usedSubmissionIds.has(s.submission_id)).map((s) => <option key={`used-${s.submission_id}`} value={s.submission_id} disabled>{s.request?.pr_number} — {s.vendor?.vendor_name} (already has a WO)</option>)}
            </Select>
          </Field>
          <Field label="Items description" required>
            <Input required value={form.items_description} onChange={(e) => setForm({ ...form, items_description: e.target.value })} placeholder="e.g. Dell Latitude 5440 laptops" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity" required><Input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Agreed price (₹)" required><Input type="number" min="0" step="0.01" required value={form.agreed_price} onChange={(e) => setForm({ ...form, agreed_price: e.target.value })} /></Field>
          </div>
          <Field label="Delivery deadline" required>
            <Input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.delivery_deadline} onChange={(e) => setForm({ ...form, delivery_deadline: e.target.value })} />
          </Field>
          <Field label="Terms & conditions">
            <Textarea rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Payment terms, warranty expectations, penalties for delay…" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
