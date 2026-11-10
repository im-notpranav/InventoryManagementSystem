// Warranty & subscription tracker. Each department tracks its equipment warranties
// and its software / service subscriptions (Microsoft 365, Photoshop, Claude…).
// The HOD and the super admin get reminders 30, 7 and 1 day before an end date,
// and once on the day (backend/src/utils/tracker.js).
// URL state: ?tab=warranties|subscriptions&id=<record> (notification links use it).
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Shield, ShieldCheck, ShieldAlert, ShieldX, CalendarClock, Trash2, RefreshCw, Filter, Repeat,
  Pencil, BellRing, FileText, IndianRupee, Users as UsersIcon, Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { warrantiesApi, subscriptionsApi, productsApi, vendorsApi } from '../../api/index.js';
import {
  PageHeader, StatCard, DataTable, Button, Modal, Select, SearchInput, Tabs, FilterChips, StatusBadge, Badge,
  Progress, KV, useToast, useConfirm, ErrorState,
} from '../../components/ui';
import { DeptBadge } from '../../components/order/OrderParts';
import { DEPARTMENTS, isSuperAdmin } from '../../lib/departments';
import { fmtDate, fmtINR, dataOf, errMsg, cn, fileUrl } from '../../lib/utils';
import { WarrantyForm, SubscriptionForm, RenewDialog, CYCLES } from './TrackerForms';

const STAGES = [30, 7, 1, 0];
const DAY = 24 * 60 * 60 * 1000;
const daysTone = (d) => (d == null ? 'slate' : d <= 7 ? 'red' : d <= 30 ? 'amber' : 'emerald');
const cycleLabel = (c) => CYCLES.find((x) => x.value === c)?.label || c;
const timeLeft = (d) => (d == null ? '—' : d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? 'Today' : `${d}d left`);

function DaysCell({ days, start, end }) {
  const tone = daysTone(days);
  let pct = 100;
  if (start && end) {
    const total = new Date(end) - new Date(start);
    pct = total > 0 ? Math.max(0, Math.min(100, ((Date.now() - new Date(start)) / total) * 100)) : 100;
  }
  return (
    <div className="min-w-[130px]">
      <div className="flex items-baseline justify-between mb-1">
        <span className={cn('text-sm font-semibold tabular', { red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-700', slate: 'text-slate-500' }[tone])}>{timeLeft(days)}</span>
        {end && <span className="text-[10px] text-slate-400">{fmtDate(end)}</span>}
      </div>
      <Progress value={days < 0 ? 100 : pct} tone={tone} size="sm" />
    </div>
  );
}

/** Which reminders have gone out and which are still to come. */
function ReminderSchedule({ end, last }) {
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  return (
    <div className="flex flex-wrap gap-2">
      {STAGES.map((stage) => {
        const when = new Date(endDay.getTime() - stage * DAY);
        const sent = last != null && stage >= last;
        const label = stage === 0 ? 'On the day' : `${stage} day${stage > 1 ? 's' : ''} before`;
        return (
          <span key={stage} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs', sent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-surface text-slate-600')}>
            {sent ? <Check className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5 text-slate-400" />}
            {label} · {fmtDate(when)}
          </span>
        );
      })}
    </div>
  );
}

export default function Warranties() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'subscriptions' ? 'subscriptions' : 'warranties';
  const openId = Number(params.get('id')) || null;
  const superAdmin = isSuperAdmin(user);

  const [warranties, setWarranties] = useState([]);
  const [subs, setSubs] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dept, setDept] = useState('');
  const [form, setForm] = useState(null); // { kind, record? }
  const [renewing, setRenewing] = useState(null); // { kind, record }

  const isW = tab === 'warranties';
  const kind = isW ? 'warranty' : 'subscription';
  const canEdit = (r) => isAdmin && (!user?.department || user.department === r.department);

  const load = async () => {
    setError(null);
    try {
      const q = dept ? { department: dept } : undefined;
      const [w, s] = await Promise.allSettled([warrantiesApi.getAll(q), subscriptionsApi.getAll(q)]);
      if (w.status === 'rejected' && s.status === 'rejected') throw w.reason;
      setWarranties(w.status === 'fulfilled' ? dataOf(w.value) : []);
      setSubs(s.status === 'fulfilled' ? dataOf(s.value) : []);
    } catch (e) {
      setError(errMsg(e, 'Failed to load the tracker'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [dept]); // eslint-disable-line react-hooks/exhaustive-deps

  // Products and vendors are only needed by the warranty form: fetch on first open.
  useEffect(() => {
    if (form?.kind !== 'warranty' || products.length) return;
    Promise.allSettled([productsApi.getAll(), vendorsApi.getAll()]).then(([p, v]) => {
      if (p.status === 'fulfilled') setProducts(dataOf(p.value));
      if (v.status === 'fulfilled') setVendors(dataOf(v.value));
    });
  }, [form?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = (t) => {
    setStatus('all');
    setSearch('');
    setParams((p) => { p.set('tab', t); p.delete('id'); return p; }, { replace: true });
  };
  const openRecord = (r) => setParams((p) => { p.set('tab', tab); p.set('id', isW ? r.warranty_id : r.subscription_id); return p; });
  const closeRecord = () => setParams((p) => { p.delete('id'); return p; });

  const list = isW ? warranties : subs;
  const viewing = openId ? list.find((r) => (isW ? r.warranty_id : r.subscription_id) === openId) : null;

  const stats = useMemo(() => {
    const by = (rows, s) => rows.filter((x) => x.status === s).length;
    return {
      w: { active: by(warranties, 'active'), soon: by(warranties, 'expiring_soon'), expired: by(warranties, 'expired') },
      s: {
        soon: by(subs, 'expiring_soon'),
        expired: by(subs, 'expired'),
        annual: subs.filter((x) => x.status !== 'expired').reduce((sum, x) => sum + (Number(x.annual_cost) || 0), 0),
      },
    };
  }, [warranties, subs]);

  // Everything ending in the next 30 days, both kinds, soonest first.
  const upcoming = useMemo(() => [
    ...warranties.filter((w) => w.status === 'expiring_soon').map((w) => ({ kind: 'warranties', id: w.warranty_id, name: w.product?.name, sub: w.serial_number ? `SN ${w.serial_number}` : w.vendor?.vendor_name, days: w.days_remaining, date: w.end_date, dept: w.department })),
    ...subs.filter((s) => s.status === 'expiring_soon').map((s) => ({ kind: 'subscriptions', id: s.subscription_id, name: s.service_name, sub: [s.plan, s.auto_renew ? 'auto-renews' : null].filter(Boolean).join(' · ') || s.provider, days: s.days_remaining, date: s.expiry_date, dept: s.department })),
  ].sort((a, b) => a.days - b.days), [warranties, subs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fields = (r) => (isW
      ? [r.product?.name, r.serial_number, r.vendor?.vendor_name, r.wo?.wo_number, r.department]
      : [r.service_name, r.provider, r.plan, r.department]);
    return list
      .filter((r) => (status === 'all' || r.status === status) && (!q || fields(r).some((v) => String(v || '').toLowerCase().includes(q))))
      .sort((a, b) => (a.days_remaining ?? 9e9) - (b.days_remaining ?? 9e9));
  }, [list, search, status, isW]);

  const afterSave = () => {
    setForm(null);
    setRenewing(null);
    load();
  };

  const remove = async (k, r) => {
    const name = k === 'warranty' ? `${r.product?.name || 'Item'}${r.serial_number ? ` · ${r.serial_number}` : ''}` : r.service_name;
    const ok = await confirm({ title: `Delete this ${k}?`, message: `${name}. Its reminders stop. This cannot be undone.`, tone: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      if (k === 'warranty') await warrantiesApi.remove(r.warranty_id);
      else await subscriptionsApi.remove(r.subscription_id);
      toast.success(`${k === 'warranty' ? 'Warranty' : 'Subscription'} deleted`);
      closeRecord();
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  const actions = (k, r) => (canEdit(r) ? (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button size="xs" variant="ghost" icon={RefreshCw} onClick={() => setRenewing({ kind: k, record: r })}>{k === 'warranty' ? 'Extend' : 'Renew'}</Button>
      <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setForm({ kind: k, record: r })} aria-label="Edit" title="Edit" />
    </div>
  ) : null);

  const wColumns = [
    { key: 'product', header: 'Equipment', sortValue: (w) => w.product?.name, render: (w) => (
      <div>
        <p className="font-medium text-slate-800">{w.product?.name || '—'}{w.quantity > 1 && <span className="text-slate-400 font-normal"> ×{w.quantity}</span>}</p>
        <p className="text-[11px] text-slate-400">{w.serial_number ? <span className="font-mono">SN {w.serial_number}</span> : w.wo?.wo_number || 'No serial'}</p>
      </div>
    ) },
    { key: 'vendor', header: 'Vendor', hideBelow: 'md', sortValue: (w) => w.vendor?.vendor_name, render: (w) => <span className="text-slate-600">{w.vendor?.vendor_name || '—'}</span> },
    ...(superAdmin ? [{ key: 'department', header: 'Dept', hideBelow: 'lg', render: (w) => <DeptBadge department={w.department} /> }] : []),
    { key: 'days_remaining', header: 'Coverage left', sortValue: (w) => w.days_remaining ?? 9e9, render: (w) => <DaysCell days={w.days_remaining} start={w.start_date} end={w.end_date} /> },
    { key: 'status', header: 'Status', hideBelow: 'md', render: (w) => <StatusBadge status={w.status} pulse={w.status === 'expiring_soon'} /> },
    ...(isAdmin ? [{ key: 'actions', header: '', sortable: false, align: 'right', render: (w) => actions('warranty', w) }] : []),
  ];

  const sColumns = [
    { key: 'service_name', header: 'Service', sortValue: (s) => s.service_name, render: (s) => (
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 grid place-items-center shrink-0 text-xs font-bold">{s.service_name.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">{s.service_name}</p>
          <p className="text-[11px] text-slate-400 truncate">{[s.provider, s.plan].filter(Boolean).join(' · ') || '—'}</p>
        </div>
      </div>
    ) },
    { key: 'cost', header: 'Cost', hideBelow: 'md', sortValue: (s) => s.annual_cost ?? -1, render: (s) => (s.cost == null ? <span className="text-slate-400">—</span> : (
      <div><p className="text-sm tabular text-slate-800">{fmtINR(s.cost)}</p><p className="text-[11px] text-slate-400">{cycleLabel(s.billing_cycle).toLowerCase()}{s.seats ? ` · ${s.seats} seats` : ''}</p></div>
    )) },
    ...(superAdmin ? [{ key: 'department', header: 'Dept', hideBelow: 'lg', render: (s) => <DeptBadge department={s.department} /> }] : []),
    { key: 'days_remaining', header: 'Renews in', sortValue: (s) => s.days_remaining ?? 9e9, render: (s) => <DaysCell days={s.days_remaining} start={s.start_date} end={s.expiry_date} /> },
    { key: 'auto_renew', header: 'Auto-renew', hideBelow: 'lg', render: (s) => <Badge tone={s.auto_renew ? 'emerald' : 'slate'} dot={s.auto_renew}>{s.auto_renew ? 'On' : 'Off'}</Badge> },
    { key: 'status', header: 'Status', hideBelow: 'md', render: (s) => <StatusBadge status={s.status} pulse={s.status === 'expiring_soon'} /> },
    ...(isAdmin ? [{ key: 'actions', header: '', sortable: false, align: 'right', render: (s) => actions('subscription', s) }] : []),
  ];

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranties & Subscriptions"
        subtitle="Equipment warranties and software licences for your department. The HOD is reminded 30, 7 and 1 day before anything ends."
        icon={Shield}
        actions={
          <>
            {superAdmin && (
              <Select value={dept} onChange={(e) => { setLoading(true); setDept(e.target.value); }} className="!w-auto min-w-[150px]" aria-label="Department">
                <option value="">All departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            )}
            <Button variant="ghost" icon={RefreshCw} onClick={load} title="Refresh" aria-label="Refresh" />
            {isAdmin && <Button icon={Plus} onClick={() => setForm({ kind })}>{isW ? 'Add warranty' : 'Add subscription'}</Button>}
          </>
        }
      />

      {!loading && upcoming.length > 0 && (
        <div className="surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-800">Ending in the next 30 days</h2>
            <Badge tone="amber" size="xs">{upcoming.length}</Badge>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
            {upcoming.slice(0, 8).map((u) => (
              <button
                key={`${u.kind}-${u.id}`}
                type="button"
                onClick={() => setParams((p) => { p.set('tab', u.kind); p.set('id', u.id); return p; })}
                className={cn('shrink-0 w-[210px] text-left rounded-xl border px-3 py-2.5 transition hover:shadow-sm', u.days <= 7 ? 'border-red-200 bg-red-50/60 hover:bg-red-50' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-xs font-semibold tabular', u.days <= 7 ? 'text-red-700' : 'text-amber-700')}>{timeLeft(u.days)}</span>
                  {u.kind === 'subscriptions' ? <Repeat className="w-3.5 h-3.5 text-violet-500" /> : <Shield className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{u.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{u.sub || fmtDate(u.date)}{superAdmin ? ` · ${u.dept}` : ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs id="warranty-tabs" value={tab} onChange={setTab} tabs={[{ key: 'warranties', label: 'Warranties', icon: ShieldCheck, count: warranties.length }, { key: 'subscriptions', label: 'Subscriptions', icon: Repeat, count: subs.length }]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isW ? (
          <>
            <StatCard index={0} loading={loading} label="Warranties" value={warranties.length} icon={Shield} tone="brand" active={status === 'all'} onClick={() => setStatus('all')} />
            <StatCard index={1} loading={loading} label="Covered" value={stats.w.active} icon={ShieldCheck} tone="emerald" active={status === 'active'} onClick={() => setStatus('active')} />
            <StatCard index={2} loading={loading} label="Ending ≤ 30 days" value={stats.w.soon} icon={ShieldAlert} tone="amber" active={status === 'expiring_soon'} onClick={() => setStatus('expiring_soon')} />
            <StatCard index={3} loading={loading} label="Expired" value={stats.w.expired} icon={ShieldX} tone="red" active={status === 'expired'} onClick={() => setStatus('expired')} />
          </>
        ) : (
          <>
            <StatCard index={0} loading={loading} label="Subscriptions" value={subs.length} icon={Repeat} tone="violet" active={status === 'all'} onClick={() => setStatus('all')} />
            <StatCard index={1} loading={loading} label="Yearly spend" value={Math.round(stats.s.annual)} prefix="₹" icon={IndianRupee} tone="emerald" hint="Active subscriptions" />
            <StatCard index={2} loading={loading} label="Renewing ≤ 30 days" value={stats.s.soon} icon={CalendarClock} tone="amber" active={status === 'expiring_soon'} onClick={() => setStatus('expiring_soon')} />
            <StatCard index={3} loading={loading} label="Lapsed" value={stats.s.expired} icon={ShieldX} tone="red" active={status === 'expired'} onClick={() => setStatus('expired')} />
          </>
        )}
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder={isW ? 'Search equipment, serial, vendor, WO…' : 'Search service, provider, plan…'} className="flex-1" />
        <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'active', label: isW ? 'Covered' : 'Active', dot: 'bg-emerald-500' }, { value: 'expiring_soon', label: 'Ending soon', dot: 'bg-amber-500' }, { value: 'expired', label: isW ? 'Expired' : 'Lapsed', dot: 'bg-red-500' }]} />
      </div>

      <DataTable
        key={tab}
        columns={isW ? wColumns : sColumns}
        rows={filtered}
        rowKey={isW ? 'warranty_id' : 'subscription_id'}
        loading={loading}
        onRowClick={openRecord}
        emptyIcon={list.length ? Filter : isW ? Shield : Repeat}
        emptyTitle={list.length ? 'Nothing matches' : isW ? 'No warranties tracked yet' : 'No subscriptions tracked yet'}
        emptyDescription={list.length ? 'Change the search or filters.' : isW ? 'Warranties are added when goods are accepted at review. You can also add one by hand.' : 'Add Microsoft 365, Adobe, Claude and other licences to get renewal reminders.'}
        emptyAction={!list.length && isAdmin ? <Button icon={Plus} onClick={() => setForm({ kind })}>{isW ? 'Add warranty' : 'Add subscription'}</Button> : undefined}
        rowClassName={(r) => (r.status === 'expired' ? 'bg-red-50/30' : r.status === 'expiring_soon' ? 'bg-amber-50/30' : '')}
        footer={<span>{filtered.length} of {list.length}</span>}
      />

      <DetailModal
        kind={kind}
        record={viewing}
        onClose={closeRecord}
        editable={viewing ? canEdit(viewing) : false}
        onEdit={() => setForm({ kind, record: viewing })}
        onRenew={() => setRenewing({ kind, record: viewing })}
        onDelete={() => remove(kind, viewing)}
      />

      <WarrantyForm open={form?.kind === 'warranty'} record={form?.record} onClose={() => setForm(null)} onSaved={afterSave} products={products} vendors={vendors} pickDepartment={superAdmin} />
      <SubscriptionForm open={form?.kind === 'subscription'} record={form?.record} onClose={() => setForm(null)} onSaved={afterSave} pickDepartment={superAdmin} />
      <RenewDialog open={!!renewing} kind={renewing?.kind} record={renewing?.record} onClose={() => setRenewing(null)} onSaved={afterSave} />
    </div>
  );
}

function DetailModal({ kind, record: r, onClose, editable, onEdit, onRenew, onDelete }) {
  if (!r) return null;
  const isW = kind === 'warranty';
  const end = isW ? r.end_date : r.expiry_date;
  const doc = r.document_url ? fileUrl(r.document_url) : null;
  const left = r.days_remaining;
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={isW ? Shield : Repeat}
      title={isW ? r.product?.name : r.service_name}
      description={isW ? (r.serial_number ? `Serial ${r.serial_number}` : `${r.quantity} unit${r.quantity > 1 ? 's' : ''}`) : [r.provider, r.plan].filter(Boolean).join(' · ') || undefined}
      footer={editable ? (
        <>
          <Button variant="ghost" icon={Trash2} className="text-red-600 hover:!bg-red-50 mr-auto" onClick={onDelete}>Delete</Button>
          <Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit</Button>
          <Button variant="success" icon={RefreshCw} onClick={onRenew}>{isW ? 'Extend' : 'Record renewal'}</Button>
        </>
      ) : <Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <StatusBadge status={r.status} pulse={r.status === 'expiring_soon'} />
          <span className={cn('text-sm font-semibold tabular', { red: 'text-red-600', amber: 'text-amber-600', emerald: 'text-emerald-700' }[daysTone(left)])}>
            {left < 0 ? `Ended ${Math.abs(left)} days ago` : left === 0 ? `${isW ? 'Ends' : 'Renews'} today` : `${left} days left`}
          </span>
          <DeptBadge department={r.department} className="ml-auto" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {isW ? (
            <>
              <KV label="Vendor" value={r.vendor?.vendor_name || '—'} />
              <KV label="Vendor contact" value={r.vendor?.phone || r.vendor?.email || '—'} />
              <KV label="Units" value={r.quantity} />
              <KV label="Start" value={fmtDate(r.start_date)} />
              <KV label="End" value={fmtDate(r.end_date)} />
              <KV label="Work order" value={r.wo?.wo_number || '—'} mono />
            </>
          ) : (
            <>
              <KV label="Cost" value={r.cost != null ? `${fmtINR(r.cost)} / ${cycleLabel(r.billing_cycle).toLowerCase()}` : '—'} />
              <KV label="Per year" value={r.annual_cost != null && r.billing_cycle !== 'one_time' ? fmtINR(r.annual_cost) : '—'} />
              <KV label="Seats" value={r.seats ? <span className="inline-flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5 text-slate-400" />{r.seats}</span> : '—'} />
              <KV label="Started" value={fmtDate(r.start_date)} />
              <KV label={r.billing_cycle === 'one_time' ? 'Valid until' : 'Next renewal'} value={fmtDate(r.expiry_date)} />
              <KV label="Auto-renew" value={r.auto_renew ? 'Yes' : 'No'} />
            </>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-2">Reminders to the HOD and super admin</p>
          <ReminderSchedule end={end} last={r.last_reminder} />
        </div>

        {(r.notes || doc) && (
          <div className="space-y-2">
            {r.notes && <p className="text-sm text-slate-600 whitespace-pre-line">{r.notes}</p>}
            {doc && (
              <a href={doc} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
                <FileText className="w-4 h-4" /> {isW ? 'Warranty card / invoice' : 'Invoice / licence document'}
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
