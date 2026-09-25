import { useEffect, useMemo, useState } from 'react';
import { Plus, Shield, ShieldCheck, ShieldAlert, ShieldX, CalendarClock, Trash2, RefreshCw, Filter, Repeat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { warrantiesApi, subscriptionsApi, productsApi } from '../../api/index.js';
import { PageHeader, StatCard, DataTable, Button, Modal, Field, Input, Select, Checkbox, SearchInput, Tabs, FilterChips, StatusBadge, Badge, Progress, KV, useToast, useConfirm, ErrorState } from '../../components/ui';
import { fmtDate, dataOf, errMsg, cn } from '../../lib/utils';

const EMPTY_W = { product_id: '', vendor_id: '', serial_number: '', start_date: '', end_date: '' };
const EMPTY_S = { product_id: '', service_name: '', expiry_date: '', auto_renew: false };

const daysTone = (d) => (d == null ? 'slate' : d < 0 ? 'red' : d <= 30 ? 'amber' : 'emerald');

export default function Warranties() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('warranties');
  const [warranties, setWarranties] = useState([]);
  const [subs, setSubs] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [showW, setShowW] = useState(false);
  const [showS, setShowS] = useState(false);
  const [wForm, setWForm] = useState(EMPTY_W);
  const [sForm, setSForm] = useState(EMPTY_S);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, s, p, v] = await Promise.allSettled([warrantiesApi.getAll(), subscriptionsApi.getAll(), productsApi.getAll(), api.get('/vendors')]);
      if (w.status === 'rejected' && s.status === 'rejected') throw w.reason;
      setWarranties(w.status === 'fulfilled' ? dataOf(w.value) : []);
      setSubs(s.status === 'fulfilled' ? dataOf(s.value) : []);
      setProducts(p.status === 'fulfilled' ? dataOf(p.value) : []);
      setVendors(v.status === 'fulfilled' ? dataOf(v.value) : []);
    } catch (e) {
      setError(errMsg(e, 'Failed to load warranties'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wStats = useMemo(() => ({
    active: warranties.filter((x) => x.status === 'active').length,
    soon: warranties.filter((x) => x.status === 'expiring_soon').length,
    expired: warranties.filter((x) => x.status === 'expired').length,
  }), [warranties]);

  const sStats = useMemo(() => ({
    soon: subs.filter((x) => x.days_remaining != null && x.days_remaining >= 0 && x.days_remaining <= 30).length,
    expired: subs.filter((x) => x.days_remaining != null && x.days_remaining < 0).length,
    auto: subs.filter((x) => x.auto_renew).length,
  }), [subs]);

  const filteredW = useMemo(() => {
    const q = search.trim().toLowerCase();
    return warranties
      .filter((w) => (status === 'all' || w.status === status) && (!q || [w.product?.name, w.serial_number, w.vendor?.vendor_name].some((v) => String(v || '').toLowerCase().includes(q))))
      .sort((a, b) => (a.days_remaining ?? 9e9) - (b.days_remaining ?? 9e9));
  }, [warranties, search, status]);

  const filteredS = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs
      .filter((s) => {
        if (status === 'expiring_soon' && !(s.days_remaining >= 0 && s.days_remaining <= 30)) return false;
        if (status === 'expired' && !(s.days_remaining < 0)) return false;
        if (status === 'active' && !(s.days_remaining > 30)) return false;
        return !q || [s.service_name, s.product?.name].some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => (a.days_remaining ?? 9e9) - (b.days_remaining ?? 9e9));
  }, [subs, search, status]);

  const saveWarranty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await warrantiesApi.create(wForm);
      toast.success('Warranty added');
      setShowW(false);
      setWForm(EMPTY_W);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to add warranty'));
    } finally {
      setSaving(false);
    }
  };

  const saveSub = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await subscriptionsApi.create(sForm);
      toast.success('Subscription added');
      setShowS(false);
      setSForm(EMPTY_S);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to add subscription'));
    } finally {
      setSaving(false);
    }
  };

  const delW = async (w) => {
    const ok = await confirm({ title: 'Delete this warranty?', message: `${w.product?.name || 'Item'}${w.serial_number ? ` · ${w.serial_number}` : ''}. This cannot be undone.`, tone: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await warrantiesApi.remove(w.warranty_id);
      toast.success('Warranty deleted');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  const DaysCell = ({ days, start, end }) => {
    const tone = daysTone(days);
    let pct = 100;
    if (start && end) {
      const total = new Date(end) - new Date(start);
      pct = total > 0 ? Math.max(0, Math.min(100, ((Date.now() - new Date(start)) / total) * 100)) : 100;
    }
    return (
      <div className="min-w-[140px]">
        <div className="flex items-baseline justify-between mb-1">
          <span className={cn('text-sm font-semibold tabular', { red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-700', slate: 'text-slate-500' }[tone])}>{days == null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}</span>
          {end && <span className="text-[10px] text-slate-400">{fmtDate(end)}</span>}
        </div>
        <Progress value={days < 0 ? 100 : pct} tone={tone} size="sm" />
      </div>
    );
  };

  const wColumns = [
    { key: 'product', header: 'Product', sortValue: (w) => w.product?.name, render: (w) => (
      <div>
        <p className="font-medium text-slate-800">{w.product?.name || '—'}</p>
        {w.serial_number && <p className="text-[11px] font-mono text-slate-400">SN {w.serial_number}</p>}
      </div>
    ) },
    { key: 'vendor', header: 'Vendor', hideBelow: 'md', sortValue: (w) => w.vendor?.vendor_name, render: (w) => <span className="text-slate-600">{w.vendor?.vendor_name || '—'}</span> },
    { key: 'start_date', header: 'Coverage', hideBelow: 'lg', sortValue: (w) => new Date(w.start_date).getTime(), render: (w) => <span className="text-xs text-slate-500">{fmtDate(w.start_date)} → {fmtDate(w.end_date)}</span> },
    { key: 'days_remaining', header: 'Time left', sortValue: (w) => w.days_remaining ?? 9e9, render: (w) => <DaysCell days={w.days_remaining} start={w.start_date} end={w.end_date} /> },
    { key: 'status', header: 'Status', hideBelow: 'md', render: (w) => <StatusBadge status={w.status} pulse={w.status === 'expiring_soon'} /> },
    ...(isAdmin ? [{ key: 'actions', header: '', sortable: false, align: 'right', hideBelow: 'md', render: (w) => <div onClick={(e) => e.stopPropagation()}><Button size="xs" variant="ghost" icon={Trash2} className="text-red-600 hover:!bg-red-50" onClick={() => delW(w)}>Delete</Button></div> }] : []),
  ];

  const sColumns = [
    { key: 'service_name', header: 'Service', render: (s) => (
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><Repeat className="w-4 h-4" /></span>
        <div>
          <p className="font-medium text-slate-800">{s.service_name}</p>
          <p className="text-[11px] text-slate-400">{s.product?.name || '—'}</p>
        </div>
      </div>
    ) },
    { key: 'expiry_date', header: 'Renews / expires', hideBelow: 'md', sortValue: (s) => new Date(s.expiry_date).getTime(), render: (s) => <span className="text-xs text-slate-500">{fmtDate(s.expiry_date)}</span> },
    { key: 'days_remaining', header: 'Time left', sortValue: (s) => s.days_remaining ?? 9e9, render: (s) => <DaysCell days={s.days_remaining} end={s.expiry_date} /> },
    { key: 'auto_renew', header: 'Auto-renew', hideBelow: 'md', render: (s) => <Badge tone={s.auto_renew ? 'emerald' : 'slate'} dot={s.auto_renew}>{s.auto_renew ? 'On' : 'Off'}</Badge> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status || (s.days_remaining < 0 ? 'expired' : s.days_remaining <= 30 ? 'expiring_soon' : 'active')} /> },
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  const isW = tab === 'warranties';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranties & Subscriptions"
        subtitle="Coverage windows and renewals. Anything expiring within 30 days is flagged and emailed daily."
        icon={Shield}
        actions={
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={load} title="Refresh" />
            {isAdmin && (isW ? <Button icon={Plus} onClick={() => setShowW(true)}>Add warranty</Button> : <Button icon={Plus} onClick={() => setShowS(true)}>Add subscription</Button>)}
          </>
        }
      />

      <Tabs id="warranty-tabs" value={tab} onChange={(t) => { setTab(t); setStatus('all'); setSearch(''); }} tabs={[{ key: 'warranties', label: 'Warranties', icon: ShieldCheck, count: warranties.length }, { key: 'subscriptions', label: 'Subscriptions', icon: Repeat, count: subs.length }]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isW ? (
          <>
            <StatCard index={0} loading={loading} label="Total warranties" value={warranties.length} icon={Shield} tone="brand" active={status === 'all'} onClick={() => setStatus('all')} />
            <StatCard index={1} loading={loading} label="Active" value={wStats.active} icon={ShieldCheck} tone="emerald" active={status === 'active'} onClick={() => setStatus('active')} />
            <StatCard index={2} loading={loading} label="Expiring ≤ 30 days" value={wStats.soon} icon={ShieldAlert} tone="amber" active={status === 'expiring_soon'} onClick={() => setStatus('expiring_soon')} />
            <StatCard index={3} loading={loading} label="Expired" value={wStats.expired} icon={ShieldX} tone="red" active={status === 'expired'} onClick={() => setStatus('expired')} />
          </>
        ) : (
          <>
            <StatCard index={0} loading={loading} label="Subscriptions" value={subs.length} icon={Repeat} tone="violet" active={status === 'all'} onClick={() => setStatus('all')} />
            <StatCard index={1} loading={loading} label="Auto-renewing" value={sStats.auto} icon={RefreshCw} tone="emerald" />
            <StatCard index={2} loading={loading} label="Renewing ≤ 30 days" value={sStats.soon} icon={CalendarClock} tone="amber" active={status === 'expiring_soon'} onClick={() => setStatus('expiring_soon')} />
            <StatCard index={3} loading={loading} label="Lapsed" value={sStats.expired} icon={ShieldX} tone="red" active={status === 'expired'} onClick={() => setStatus('expired')} />
          </>
        )}
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder={isW ? 'Search product, serial, vendor…' : 'Search service or product…'} className="flex-1" />
        <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active', dot: 'bg-emerald-500' }, { value: 'expiring_soon', label: 'Expiring soon', dot: 'bg-amber-500' }, { value: 'expired', label: 'Expired', dot: 'bg-red-500' }]} />
      </div>

      {isW ? (
        <DataTable columns={wColumns} rows={filteredW} rowKey="warranty_id" loading={loading} emptyIcon={warranties.length ? Filter : Shield} emptyTitle={warranties.length ? 'No warranties match' : 'No warranties tracked'} emptyDescription={warranties.length ? 'Adjust the filters.' : 'Add warranties for purchased equipment to get expiry reminders.'} rowClassName={(w) => (w.status === 'expired' ? 'bg-red-50/30' : w.status === 'expiring_soon' ? 'bg-amber-50/30' : '')} footer={<span>{filteredW.length} of {warranties.length}</span>}
          expandable={(w) => (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KV label="Serial number" value={w.serial_number || '—'} mono />
              <KV label="Vendor" value={w.vendor?.vendor_name || '—'} />
              <KV label="Start" value={fmtDate(w.start_date)} />
              <KV label="End" value={fmtDate(w.end_date)} />
            </div>
          )} />
      ) : (
        <DataTable columns={sColumns} rows={filteredS} rowKey="subscription_id" loading={loading} emptyIcon={subs.length ? Filter : Repeat} emptyTitle={subs.length ? 'No subscriptions match' : 'No subscriptions tracked'} emptyDescription={subs.length ? 'Adjust the filters.' : 'Track software licences and service contracts here.'} footer={<span>{filteredS.length} of {subs.length}</span>} />
      )}

      <Modal open={showW} onClose={() => setShowW(false)} icon={Shield} title="Add warranty" description="Coverage window for a purchased product." footer={<><Button variant="secondary" onClick={() => setShowW(false)}>Cancel</Button><Button type="submit" form="add-w" loading={saving}>Save warranty</Button></>}>
        <form id="add-w" onSubmit={saveWarranty} className="space-y-4">
          <Field label="Product" required>
            <Select required value={wForm.product_id} onChange={(e) => setWForm({ ...wForm, product_id: e.target.value })} placeholder="Select product…">{products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}</Select>
          </Field>
          <Field label="Vendor" required>
            <Select required value={wForm.vendor_id} onChange={(e) => setWForm({ ...wForm, vendor_id: e.target.value })} placeholder="Select vendor…">{vendors.map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}</Select>
          </Field>
          <Field label="Serial number"><Input value={wForm.serial_number} onChange={(e) => setWForm({ ...wForm, serial_number: e.target.value })} placeholder="Optional" mono /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" required><Input type="date" required value={wForm.start_date} onChange={(e) => setWForm({ ...wForm, start_date: e.target.value })} /></Field>
            <Field label="End date" required><Input type="date" required min={wForm.start_date || undefined} value={wForm.end_date} onChange={(e) => setWForm({ ...wForm, end_date: e.target.value })} /></Field>
          </div>
        </form>
      </Modal>

      <Modal open={showS} onClose={() => setShowS(false)} icon={Repeat} title="Add subscription" description="Software licence or recurring service." footer={<><Button variant="secondary" onClick={() => setShowS(false)}>Cancel</Button><Button type="submit" form="add-s" loading={saving}>Save subscription</Button></>}>
        <form id="add-s" onSubmit={saveSub} className="space-y-4">
          <Field label="Service name" required><Input required autoFocus value={sForm.service_name} onChange={(e) => setSForm({ ...sForm, service_name: e.target.value })} placeholder="e.g. Adobe Creative Cloud" /></Field>
          <Field label="Linked product" required>
            <Select required value={sForm.product_id} onChange={(e) => setSForm({ ...sForm, product_id: e.target.value })} placeholder="Select product…">{products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}</Select>
          </Field>
          <Field label="Expiry / renewal date" required><Input type="date" required value={sForm.expiry_date} onChange={(e) => setSForm({ ...sForm, expiry_date: e.target.value })} /></Field>
          <Checkbox label="Auto-renews" description="We'll still remind you 30 days before." checked={sForm.auto_renew} onChange={(e) => setSForm({ ...sForm, auto_renew: e.target.checked })} />
        </form>
      </Modal>
    </div>
  );
}
