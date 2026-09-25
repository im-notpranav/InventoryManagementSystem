import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, Check, XCircle, Send, ShoppingCart, Search as SearchIcon, PackagePlus, Package, Warehouse, CalendarClock, IndianRupee,
  FileText, Sparkles, ClipboardList, Download, Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import WorkflowTracker from '../../components/WorkflowTracker';
import Stepper, { Step } from '../../components/reactbits/Stepper/Stepper';
import {
  PageHeader, StatCard, DataTable, StatusBadge, PriorityBadge, Button, Modal, Field, Input, Select, Textarea, SearchInput, Segmented,
  FilterChips, KV, useToast, Checkbox, Badge,
} from '../../components/ui';
import { fmtDate, fmtINR, dataOf, errMsg, downloadCsv, cn } from '../../lib/utils';
import { PR_WORKFLOW_STEP, statusMeta } from '../../lib/status';

const STATUS_OPTIONS = ['pending', 'approved', 'rfq_sent', 'quotation_approved', 'dispatched', 'gate_entry', 'bill_released', 'rejected'];

const EMPTY_FORM = { product_id: '', warehouse_id: '', quantity: '', priority: 'medium', justification: '', required_date: '', estimated_cost: '', budget_code: '' };
const EMPTY_PRODUCT = { name: '', sku: '', unit: 'piece', unit_price: '', description: '' };

export default function PurchaseRequestPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.status || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(!!location.state?.create);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rfqTarget, setRfqTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [busy, setBusy] = useState(null);

  // Clear router state so a refresh doesn't re-open the modal
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    const [pr, prod, wh, ve] = await Promise.allSettled([
      api.get('/purchase-requests'),
      api.get('/products'),
      api.get('/warehouses'),
      isAdmin ? api.get('/vendors') : Promise.reject(new Error('skip')),
    ]);
    setRequests(pr.status === 'fulfilled' ? dataOf(pr.value) : []);
    setProducts(prod.status === 'fulfilled' ? dataOf(prod.value) : []);
    setWarehouses(wh.status === 'fulfilled' ? dataOf(wh.value) : []);
    setVendors(ve.status === 'fulfilled' ? dataOf(ve.value) : []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: requests.length };
    requests.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (!q) return true;
      return [r.pr_number, r.product?.name, r.user?.department, r.user?.name, r.budget_code].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [requests, search, statusFilter, priorityFilter]);

  const approve = async (pr) => {
    setBusy(pr.request_id);
    try {
      await api.put(`/purchase-requests/${pr.request_id}/approve`);
      toast.success(`${pr.pr_number || 'Request'} approved`, { title: 'Approved' });
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to approve'));
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setBusy('reject');
    try {
      await api.put(`/purchase-requests/${rejectTarget.request_id}/reject`, { reason: rejectReason });
      toast.success(`${rejectTarget.pr_number || 'Request'} rejected`);
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to reject'));
    } finally {
      setBusy(null);
    }
  };

  const sendRfq = async () => {
    if (!rfqTarget || selectedVendors.length === 0) return;
    setBusy('rfq');
    try {
      await api.post('/rfq/send', { request_id: rfqTarget.request_id, vendor_ids: selectedVendors });
      toast.success(`RFQ sent to ${selectedVendors.length} vendor${selectedVendors.length > 1 ? 's' : ''}`, { title: 'RFQ dispatched' });
      setRfqTarget(null);
      setSelectedVendors([]);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to send RFQ'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      'purchase-requests.csv',
      ['PR Number', 'Product', 'Department', 'Qty', 'Priority', 'Status', 'Estimated Cost', 'Required By', 'Raised'],
      filtered.map((r) => [r.pr_number, r.product?.name, r.user?.department, r.quantity, r.priority, r.status, r.estimated_cost, r.required_date, r.requested_at]),
    );

  const columns = [
    { key: 'pr_number', header: 'Request', render: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{r.pr_number || `#${r.request_id}`}</span> },
    {
      key: 'product',
      header: 'Product',
      sortValue: (r) => r.product?.name,
      render: (r) => (
        <div className="min-w-0 cell-text">
          <p className="font-medium text-slate-800">{r.product?.name || '—'}</p>
          {r.product?.sku && <p className="text-[11px] text-slate-400 font-mono">{r.product.sku}</p>}
        </div>
      ),
    },
    ...(isAdmin
      ? [{ key: 'dept', header: 'Requester', hideBelow: 'lg', sortValue: (r) => r.user?.department, render: (r) => (
          <div>
            <p className="text-slate-700">{r.user?.name || '—'}</p>
            <p className="text-[11px] text-slate-400">{r.user?.department || ''}</p>
          </div>
        ) }]
      : []),
    { key: 'quantity', header: 'Qty', align: 'right', hideBelow: 'md', render: (r) => <span className="tabular font-medium">{r.quantity}</span> },
    { key: 'estimated_cost', header: 'Est. cost', align: 'right', hideBelow: 'md', sortValue: (r) => Number(r.estimated_cost || 0), render: (r) => <span className="tabular text-slate-600">{r.estimated_cost ? fmtINR(r.estimated_cost) : '—'}</span> },
    { key: 'priority', header: 'Priority', hideBelow: 'md', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'requested_at', header: 'Raised', hideBelow: 'lg', sortValue: (r) => new Date(r.requested_at).getTime(), render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.requested_at)}</span> },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            sortable: false,
            align: 'right',
            hideBelow: 'md',
            render: (r) => (
              <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                {r.status === 'pending' && (
                  <>
                    <Button size="xs" variant="success-soft" icon={Check} loading={busy === r.request_id} onClick={() => approve(r)}>
                      Approve
                    </Button>
                    <Button size="xs" variant="danger-soft" icon={XCircle} disabled={!!busy} onClick={() => setRejectTarget(r)}>
                      Reject
                    </Button>
                  </>
                )}
                {r.status === 'approved' && (
                  <Button size="xs" variant="violet-soft" icon={Send} onClick={() => { setRfqTarget(r); setSelectedVendors([]); setVendorSearch(''); }}>
                    Send RFQ
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const stats = [
    { label: 'Total requests', value: requests.length, icon: ClipboardList, tone: 'brand', key: 'all' },
    { label: 'Pending', value: counts.pending || 0, icon: CalendarClock, tone: 'amber', key: 'pending' },
    { label: 'In procurement', value: (counts.approved || 0) + (counts.rfq_sent || 0) + (counts.quotation_approved || 0) + (counts.dispatched || 0), icon: Send, tone: 'violet', key: 'approved' },
    { label: 'Completed', value: counts.bill_released || 0, icon: Check, tone: 'emerald', key: 'bill_released' },
  ];

  const vendorList = vendors.filter((v) => !v.is_blacklisted && (!vendorSearch || `${v.vendor_name} ${v.email}`.toLowerCase().includes(vendorSearch.toLowerCase())));

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Purchase Requests' : 'My Purchase Requests'}
        subtitle={isAdmin ? 'Review department requests, approve them and float RFQs to vendors.' : 'Raise requests for items your department needs and follow them through procurement.'}
        icon={ShoppingCart}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!filtered.length} className="hidden sm:inline-flex">
              Export
            </Button>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              New request
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} loading={loading} label={s.label} value={s.value} icon={s.icon} tone={s.tone} active={statusFilter === s.key} onClick={() => setStatusFilter(s.key)} />
        ))}
      </div>

      {/* Filters */}
      <div className="surface p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search PR number, product, department…" className="flex-1" />
          <div className="flex gap-2">
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="!w-auto min-w-[150px] !bg-white">
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            {(statusFilter !== 'all' || priorityFilter !== 'all' || search) && (
              <Button variant="ghost" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setSearch(''); }}>
                Clear
              </Button>
            )}
          </div>
        </div>
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
        emptyIcon={Filter}
        emptyTitle={requests.length ? 'No requests match these filters' : 'No purchase requests yet'}
        emptyDescription={requests.length ? 'Try a different status or clear the search.' : 'Create your first request — it takes under a minute.'}
        emptyAction={!requests.length && <Button icon={Plus} size="sm" onClick={() => setCreateOpen(true)}>New request</Button>}
        footer={<span>Showing {filtered.length} of {requests.length}</span>}
        expandable={(pr) => <RequestDetail pr={pr} />}
      />

      {/* Create wizard */}
      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        products={products}
        warehouses={warehouses}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />

      {/* Reject */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        size="sm"
        tone="danger"
        icon={XCircle}
        title={`Reject ${rejectTarget?.pr_number || 'request'}`}
        description="The requester will be notified with your reason."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={busy === 'reject'} disabled={!rejectReason.trim()} onClick={reject}>Reject request</Button>
          </>
        }
      >
        <Field label="Reason" required hint="Be specific — this is shown to the department.">
          <Textarea autoFocus value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Budget exhausted for this quarter; resubmit in April." rows={4} />
        </Field>
      </Modal>

      {/* Send RFQ */}
      <Modal
        open={!!rfqTarget}
        onClose={() => setRfqTarget(null)}
        icon={Send}
        title="Send request for quotation"
        description={rfqTarget ? `${rfqTarget.pr_number} · ${rfqTarget.product?.name} × ${rfqTarget.quantity}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRfqTarget(null)}>Cancel</Button>
            <Button variant="violet" icon={Send} loading={busy === 'rfq'} disabled={!selectedVendors.length} onClick={sendRfq}>
              Send to {selectedVendors.length || ''} vendor{selectedVendors.length === 1 ? '' : 's'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SearchInput value={vendorSearch} onChange={setVendorSearch} placeholder="Filter vendors…" className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setSelectedVendors(selectedVendors.length === vendorList.length ? [] : vendorList.map((v) => v.vendor_id))}>
              {selectedVendors.length === vendorList.length && vendorList.length ? 'Clear' : 'Select all'}
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {vendorList.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No active vendors found.</p>}
            {vendorList.map((v) => {
              const on = selectedVendors.includes(v.vendor_id);
              return (
                <label
                  key={v.vendor_id}
                  className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition', on ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 hover:bg-slate-50')}
                >
                  <input type="checkbox" className="w-4 h-4 accent-violet-600" checked={on} onChange={(e) => setSelectedVendors(e.target.checked ? [...selectedVendors, v.vendor_id] : selectedVendors.filter((id) => id !== v.vendor_id))} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{v.vendor_name}</p>
                    <p className="text-xs text-slate-500 truncate">{v.email}</p>
                  </div>
                  {v.rating != null && <Badge tone="amber" size="xs">★ {v.rating}</Badge>}
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ───────────────── Expanded row ───────────────── */
function RequestDetail({ pr }) {
  const step = PR_WORKFLOW_STEP[pr.status] ?? 0;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400 font-semibold mb-3">Workflow progress</p>
        <WorkflowTracker currentStep={step} rejected={pr.status === 'rejected'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KV label="Warehouse" value={pr.warehouse?.name} />
        <KV label="Required by" value={pr.required_date ? fmtDate(pr.required_date) : 'Not set'} />
        <KV label="Estimated cost" value={pr.estimated_cost ? fmtINR(pr.estimated_cost) : '—'} />
        <KV label="Budget code" value={pr.budget_code || '—'} mono />
        <KV label="Requested by" value={pr.user ? `${pr.user.name}${pr.user.department ? ` · ${pr.user.department}` : ''}` : '—'} />
        <KV label="Approved" value={pr.approved_at ? fmtDate(pr.approved_at) : pr.status === 'rejected' ? 'Rejected' : 'Pending'} />
      </div>
      {(pr.justification || pr.rejection_reason || pr.admin_remarks) && (
        <div className="grid md:grid-cols-2 gap-4">
          {pr.justification && (
            <div className="rounded-xl bg-white border border-slate-200 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-1">Justification</p>
              <p className="text-sm text-slate-700 leading-relaxed">{pr.justification}</p>
            </div>
          )}
          {pr.rejection_reason && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-red-500 font-semibold mb-1">Rejection reason</p>
              <p className="text-sm text-red-800 leading-relaxed">{pr.rejection_reason}</p>
            </div>
          )}
          {pr.admin_remarks && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-amber-600 font-semibold mb-1">Admin remarks</p>
              <p className="text-sm text-amber-900 leading-relaxed">{pr.admin_remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Create wizard (React Bits Stepper) ───────────────── */
function CreateRequestModal({ open, onClose, products, warehouses, onCreated }) {
  const toast = useToast();
  const [mode, setMode] = useState('existing');
  const [form, setForm] = useState(EMPTY_FORM);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [productSearch, setProductSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setMode('existing');
      setForm(EMPTY_FORM);
      setNewProduct(EMPTY_PRODUCT);
      setProductSearch('');
      setStep(1);
      setErrors({});
    }
  }, [open]);

  const selectedProduct = products.find((p) => String(p.product_id) === String(form.product_id));
  const unitPrice = mode === 'existing' ? Number(selectedProduct?.unit_price || 0) : Number(newProduct.unit_price || 0);
  const autoEstimate = unitPrice && Number(form.quantity) ? unitPrice * Number(form.quantity) : null;

  const productMatches = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => !q || `${p.name} ${p.sku} ${p.category?.name || ''}`.toLowerCase().includes(q)).slice(0, 60);
  }, [products, productSearch]);

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (mode === 'existing' && !form.product_id) e.product_id = 'Pick a product';
      if (mode === 'new' && !newProduct.name.trim()) e.name = 'Product name is required';
    }
    if (s === 2) {
      if (!form.warehouse_id) e.warehouse_id = 'Choose a warehouse';
      if (!form.quantity || Number(form.quantity) < 1) e.quantity = 'Quantity must be at least 1';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    try {
      const body = {
        warehouse_id: form.warehouse_id,
        quantity: form.quantity,
        priority: form.priority,
        justification: form.justification || undefined,
        required_date: form.required_date || undefined,
        estimated_cost: form.estimated_cost || (autoEstimate ? String(autoEstimate) : undefined),
        budget_code: form.budget_code || undefined,
      };
      if (mode === 'existing') body.product_id = form.product_id;
      else
        body.new_product = {
          name: newProduct.name.trim(),
          sku: newProduct.sku?.trim() || undefined,
          unit: newProduct.unit || 'piece',
          unit_price: newProduct.unit_price !== '' ? parseFloat(newProduct.unit_price) : undefined,
          description: newProduct.description?.trim() || undefined,
        };
      const res = await api.post('/purchase-requests', body);
      const pr = res.data?.data;
      toast.success(pr?.pr_number ? `${pr.pr_number} submitted for approval` : 'Request submitted', { title: 'Purchase request created' });
      onCreated();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to create request'));
    } finally {
      setSubmitting(false);
    }
  };

  const nextProps = {
    onClick: (e) => {
      // Stepper's own handler runs after ours; block advance if invalid.
      if (!validateStep(step)) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={PackagePlus} title="New purchase request" description="Three quick steps — pick the item, add details, review and submit." bodyClassName="!p-0">
      <Stepper
        key={open ? 'open' : 'closed'}
        initialStep={1}
        onStepChange={(s) => setStep(s)}
        onFinalStepCompleted={submit}
        className="flex flex-col"
        stepCircleContainerClassName="!max-w-none !rounded-none !shadow-none !border-0"
        stepContainerClassName="!px-6 !py-4 border-b border-slate-100 bg-slate-50/50"
        contentClassName="!px-6 !py-5"
        footerClassName="!px-6 !pb-5"
        backButtonText="Back"
        nextButtonText={step === 3 ? (submitting ? 'Submitting…' : 'Submit request') : 'Continue'}
        nextButtonProps={{ ...nextProps, disabled: submitting, className: 'inline-flex items-center justify-center h-10 px-5 rounded-xl bg-brand-700 text-white text-sm font-medium hover:bg-brand-600 transition disabled:opacity-50' }}
        backButtonProps={{ className: 'inline-flex items-center h-10 px-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition' }}
      >
        {/* Step 1: item */}
        <Step>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-display font-semibold text-slate-900">What do you need?</h4>
                <p className="text-xs text-slate-500">Pick from the catalogue or describe a new item.</p>
              </div>
              <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'existing', label: 'Catalogue' }, { value: 'new', label: 'New item' }]} />
            </div>

            {mode === 'existing' ? (
              <div className="space-y-3">
                <SearchInput value={productSearch} onChange={setProductSearch} placeholder="Search by name, SKU or category…" autoFocus />
                {errors.product_id && <p className="text-xs text-red-600">{errors.product_id}</p>}
                <div className="grid sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {productMatches.length === 0 && <p className="col-span-full text-sm text-slate-500 text-center py-8">No products match. Try “New item”.</p>}
                  {productMatches.map((p) => {
                    const on = String(p.product_id) === String(form.product_id);
                    return (
                      <button
                        key={p.product_id}
                        type="button"
                        onClick={() => setForm({ ...form, product_id: String(p.product_id) })}
                        className={cn('text-left rounded-xl border p-3 transition-all', on ? 'border-brand-500 bg-brand-50 shadow-glow' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0', on ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-500')}>
                            <Package className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              <span className="font-mono">{p.sku}</span>
                              {p.category?.name ? ` · ${p.category.name}` : ''}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 tabular shrink-0">{fmtINR(p.unit_price)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <p className="text-xs text-amber-900 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> A new catalogue entry will be created and reviewed by Admin.</p>
                <Field label="Product name" required error={errors.name}>
                  <Input autoFocus value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. USB-C docking station" className="!bg-white" error={errors.name} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SKU" hint="Auto-generated if blank">
                    <Input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Optional" className="!bg-white" mono />
                  </Field>
                  <Field label="Unit">
                    <Select value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} className="!bg-white">
                      {['piece', 'box', 'set', 'kg', 'litre', 'metre', 'other'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estimated unit price (₹)">
                    <Input type="number" min="0" step="0.01" value={newProduct.unit_price} onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value })} className="!bg-white" />
                  </Field>
                  <Field label="Description">
                    <Input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Short spec" className="!bg-white" />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </Step>

        {/* Step 2: details */}
        <Step>
          <div className="space-y-4">
            <div>
              <h4 className="font-display font-semibold text-slate-900">Delivery & quantity</h4>
              <p className="text-xs text-slate-500">Where should it go and how many do you need?</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Warehouse" required error={errors.warehouse_id}>
                <Select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} placeholder="Select warehouse…" error={errors.warehouse_id}>
                  {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}{w.location ? ` — ${w.location}` : ''}</option>)}
                </Select>
              </Field>
              <Field label="Quantity" required error={errors.quantity}>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} error={errors.quantity} autoFocus />
              </Field>
              <Field label="Priority">
                <div className="grid grid-cols-4 gap-1.5">
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={cn('rounded-lg border px-2 py-2 text-xs font-medium capitalize transition', form.priority === p ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Required by">
                <Input type="date" min={new Date().toISOString().slice(0, 10)} value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} />
              </Field>
              <Field label="Estimated cost (₹)" hint={autoEstimate ? `Suggested from unit price: ${fmtINR(autoEstimate)}` : undefined}>
                <Input type="number" min="0" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} placeholder={autoEstimate ? String(autoEstimate) : 'Optional'} />
              </Field>
              <Field label="Budget code">
                <Input value={form.budget_code} onChange={(e) => setForm({ ...form, budget_code: e.target.value })} placeholder="Optional" mono />
              </Field>
            </div>
            <Field label="Justification" hint="Helps Admin approve faster.">
              <Textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} placeholder="Why is this needed, and what happens without it?" rows={3} />
            </Field>
          </div>
        </Step>

        {/* Step 3: review */}
        <Step>
          <div className="space-y-4">
            <div>
              <h4 className="font-display font-semibold text-slate-900">Review & submit</h4>
              <p className="text-xs text-slate-500">Double-check the details before sending for approval.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-brand-50 to-white border-b border-slate-100">
                <span className="w-11 h-11 rounded-xl bg-brand-700 text-white grid place-items-center">
                  <Package className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-slate-900 truncate">{mode === 'existing' ? selectedProduct?.name || 'Product' : newProduct.name || 'New product'}</p>
                  <p className="text-xs text-slate-500">
                    {mode === 'existing' ? selectedProduct?.sku : newProduct.sku || 'SKU auto-generated'} · {form.quantity || 0} {mode === 'existing' ? selectedProduct?.unit || 'units' : newProduct.unit}
                  </p>
                </div>
                <PriorityBadge priority={form.priority} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
                <KV label="Warehouse" value={warehouses.find((w) => String(w.warehouse_id) === String(form.warehouse_id))?.name || '—'} />
                <KV label="Required by" value={form.required_date ? fmtDate(form.required_date) : 'Not set'} />
                <KV label="Estimated cost" value={form.estimated_cost ? fmtINR(form.estimated_cost) : autoEstimate ? `${fmtINR(autoEstimate)} (auto)` : '—'} />
                <KV label="Budget code" value={form.budget_code || '—'} mono />
                <KV label="Source" value={mode === 'existing' ? 'Catalogue item' : 'New item (admin review)'} />
                <KV label="Approval" value="Admin" />
              </div>
              {form.justification && (
                <div className="px-4 pb-4">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-1">Justification</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed">{form.justification}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> A PR number is generated on submit and the Admin team is notified.</p>
          </div>
        </Step>
      </Stepper>
    </Modal>
  );
}
