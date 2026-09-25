import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShoppingCart, Truck, AlertTriangle, ClipboardList, ArrowRight, Plus, Package, Shield, MessageSquare, Clock,
  CheckCircle2, Send, Sparkles, Activity, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import useChatbotStore from '../../store/chatbot.store';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, PriorityBadge, Button, EmptyState, Stagger, StaggerItem, Progress } from '../../components/ui';
import ShinyText from '../../components/reactbits/ShinyText/ShinyText';
import { fmtDate, timeAgo, dataOf, fmtINR } from '../../lib/utils';
import { statusMeta } from '../../lib/status';
import { DOT } from '../../components/ui/Badge';

const ICON_TONE = {
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
  brand: 'bg-brand-50 text-brand-700',
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const openChat = useChatbotStore((s) => s.open);
  const [prs, setPrs] = useState([]);
  const [wos, setWos] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const calls = [
        api.get('/purchase-requests'),
        api.get('/inventory/low-stock'),
        api.get('/warranties'),
        api.get('/inventory/summary'),
        isAdmin ? api.get('/work-orders') : Promise.reject(new Error('skip')),
        isAdmin ? api.get('/vendors') : Promise.reject(new Error('skip')),
      ];
      const [pr, ls, wr, inv, wo, ve] = await Promise.allSettled(calls);
      if (!alive) return;
      setPrs(pr.status === 'fulfilled' ? dataOf(pr.value) : []);
      setLowStock(ls.status === 'fulfilled' ? dataOf(ls.value) : []);
      setWarranties(wr.status === 'fulfilled' ? dataOf(wr.value) : []);
      setInventorySummary(inv.status === 'fulfilled' ? dataOf(inv.value, null) : null);
      setWos(wo.status === 'fulfilled' ? dataOf(wo.value) : []);
      setVendors(ve.status === 'fulfilled' ? dataOf(ve.value) : []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const pending = prs.filter((p) => p.status === 'pending');
  const activeWos = wos.filter((w) => ['issued', 'acknowledged', 'dispatched'].includes(w.status));
  const expiring = warranties.filter((w) => w.status === 'expiring_soon');

  const statusBreakdown = useMemo(() => {
    const counts = {};
    prs.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    const order = ['pending', 'approved', 'rfq_sent', 'quotation_approved', 'dispatched', 'gate_entry', 'bill_released', 'rejected'];
    return order.filter((k) => counts[k]).map((k) => ({ key: k, count: counts[k], ...statusMeta(k) }));
  }, [prs]);

  const activity = useMemo(() => {
    const ev = [];
    prs.forEach((p) => {
      ev.push({ at: p.requested_at, icon: ShoppingCart, tone: 'amber', text: `${p.pr_number || `PR #${p.request_id}`} raised for ${p.product?.name || 'item'}`, sub: p.user?.department });
      if (p.approved_at) ev.push({ at: p.approved_at, icon: CheckCircle2, tone: 'emerald', text: `${p.pr_number} approved` });
      if (p.status === 'rejected' && p.updated_at) ev.push({ at: p.updated_at, icon: AlertTriangle, tone: 'red', text: `${p.pr_number} rejected` });
    });
    wos.forEach((w) => {
      ev.push({ at: w.created_at, icon: ClipboardList, tone: 'violet', text: `Work order ${w.wo_number} issued`, sub: w.vendor?.vendor_name });
      if (w.dispatched_at) ev.push({ at: w.dispatched_at, icon: Send, tone: 'blue', text: `${w.wo_number} dispatched`, sub: w.vendor?.vendor_name });
    });
    return ev.filter((e) => e.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  }, [prs, wos]);

  const stats = isAdmin
    ? [
        { label: 'Pending approvals', value: pending.length, icon: ShoppingCart, tone: 'amber', to: '/purchase-requests', hint: pending.length ? 'Needs your review' : 'All caught up' },
        { label: 'Active work orders', value: activeWos.length, icon: ClipboardList, tone: 'violet', to: '/work-orders' },
        { label: 'Low stock items', value: lowStock.length, icon: AlertTriangle, tone: lowStock.length ? 'red' : 'emerald', to: '/inventory' },
        { label: 'Registered vendors', value: vendors.length, icon: Truck, tone: 'brand', to: '/vendors' },
      ]
    : [
        { label: 'My requests', value: prs.length, icon: ShoppingCart, tone: 'brand', to: '/purchase-requests' },
        { label: 'Awaiting approval', value: pending.length, icon: Clock, tone: 'amber', to: '/purchase-requests' },
        { label: 'Low stock items', value: lowStock.length, icon: AlertTriangle, tone: lowStock.length ? 'red' : 'emerald', to: '/inventory' },
        { label: 'Warranties expiring', value: expiring.length, icon: Shield, tone: 'violet', to: '/warranties' },
      ];

  const prColumns = [
    { key: 'pr_number', header: 'Request', render: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand-700">{r.pr_number || `#${r.request_id}`}</span> },
    { key: 'product', header: 'Product', sortValue: (r) => r.product?.name, render: (r) => <span className="font-medium text-slate-800">{r.product?.name || '—'}</span> },
    ...(isAdmin ? [{ key: 'dept', header: 'Department', hideBelow: 'md', sortValue: (r) => r.user?.department, render: (r) => r.user?.department || '—' }] : []),
    { key: 'quantity', header: 'Qty', align: 'right', hideBelow: 'md', render: (r) => <span className="tabular">{r.quantity}</span> },
    { key: 'priority', header: 'Priority', hideBelow: 'md', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'requested_at', header: 'Raised', hideBelow: 'lg', sortValue: (r) => new Date(r.requested_at).getTime(), render: (r) => <span className="text-slate-500 text-xs">{fmtDate(r.requested_at)}</span> },
  ];

  const totalValue = inventorySummary?.total_value;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${greeting()}, ${user?.name || 'there'}`}
        title="Here's today's picture"

        subtitle={isAdmin ? 'Approvals, orders and stock health across the department — updated live.' : 'Track your requests and keep an eye on stock and warranties.'}
        actions={
          <>
            <Button variant="secondary" icon={MessageSquare} onClick={openChat} className="hidden sm:inline-flex">
              Ask InventBot
            </Button>
            <Button icon={Plus} onClick={() => navigate('/purchase-requests', { state: { create: true } })}>
              New request
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} loading={loading} label={s.label} value={s.value} icon={s.icon} tone={s.tone} hint={s.hint} onClick={() => navigate(s.to)} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent PRs */}
        <div className="xl:col-span-2 space-y-6">
          <Card
            title={isAdmin ? 'Recent purchase requests' : 'My recent requests'}
            description={`${prs.length} total · ${pending.length} pending`}
            icon={ShoppingCart}
            padded={false}
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-requests')}>
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          >
            <DataTable
              className="!border-0 !shadow-none !rounded-none"
              columns={prColumns}
              rows={prs.slice(0, 8)}
              rowKey="request_id"
              loading={loading}
              skeletonRows={5}
              onRowClick={() => navigate('/purchase-requests')}
              emptyTitle="No purchase requests yet"
              emptyDescription="Raise your first request and it will show up here with its live workflow status."
              emptyAction={
                <Button size="sm" icon={Plus} onClick={() => navigate('/purchase-requests', { state: { create: true } })}>
                  New request
                </Button>
              }
            />
          </Card>

          {/* Status breakdown */}
          {statusBreakdown.length > 0 && (
            <Card title="Pipeline by status" icon={TrendingUp} description="Where requests currently sit in the procurement flow">
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                {statusBreakdown.map((s, i) => (
                  <motion.div
                    key={s.key}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / prs.length) * 100}%` }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={DOT[s.tone]}
                    title={`${s.label}: ${s.count}`}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statusBreakdown.map((s) => (
                  <button key={s.key} type="button" onClick={() => navigate('/purchase-requests', { state: { status: s.key } })} className="flex items-center gap-2 text-left rounded-lg px-2 py-1.5 hover:bg-slate-50 transition">
                    <span className={`w-2.5 h-2.5 rounded-sm ${DOT[s.tone]}`} />
                    <span className="text-sm text-slate-600 flex-1 truncate">{s.label}</span>
                    <span className="text-sm font-semibold text-slate-900 tabular">{s.count}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Attention */}
          <Card title="Needs attention" icon={Sparkles} description="Prioritised for you">
            <Stagger className="space-y-2.5">
              {isAdmin && pending.length > 0 && (
                <AttentionRow tone="amber" icon={ShoppingCart} title={`${pending.length} request${pending.length > 1 ? 's' : ''} awaiting approval`} sub="Approve or reject to keep the pipeline moving" onClick={() => navigate('/purchase-requests', { state: { status: 'pending' } })} />
              )}
              {lowStock.length > 0 && (
                <AttentionRow tone="red" icon={Package} title={`${lowStock.length} item${lowStock.length > 1 ? 's' : ''} at or below reorder point`} sub={lowStock.slice(0, 2).map((i) => i.product?.name).filter(Boolean).join(', ')} onClick={() => navigate('/inventory', { state: { status: 'low' } })} />
              )}
              {expiring.length > 0 && (
                <AttentionRow tone="violet" icon={Shield} title={`${expiring.length} warrant${expiring.length > 1 ? 'ies' : 'y'} expiring within 30 days`} sub="Plan renewals before coverage lapses" onClick={() => navigate('/warranties')} />
              )}
              {isAdmin && wos.filter((w) => w.status === 'dispatched').length > 0 && (
                <AttentionRow tone="blue" icon={Truck} title={`${wos.filter((w) => w.status === 'dispatched').length} deliver${wos.filter((w) => w.status === 'dispatched').length > 1 ? 'ies' : 'y'} in transit`} sub="Security will verify invoice numbers at the gate" onClick={() => navigate('/gate-entry')} />
              )}
              {!loading && pending.length === 0 && lowStock.length === 0 && expiring.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">You're all caught up</p>
                    <p className="text-xs text-emerald-700/80">Nothing needs your attention right now.</p>
                  </div>
                </div>
              )}
              {loading && [1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}
            </Stagger>
          </Card>

          {/* Inventory health */}
          <Card title="Inventory health" icon={Package} actions={<Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>Open</Button>}>
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-8 w-32" />
                <div className="skeleton h-2" />
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Stock value</p>
                    <p className="font-display text-2xl font-bold text-slate-900 mt-0.5">{totalValue != null ? fmtINR(totalValue) : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Products</p>
                    <p className="font-display text-xl font-bold text-slate-900">{inventorySummary?.total_products ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <HealthRow label="Healthy" value={(inventorySummary?.total_products ?? 0) - (inventorySummary?.low_stock_count ?? 0) - (inventorySummary?.out_of_stock_count ?? 0)} total={inventorySummary?.total_products} tone="emerald" />
                  <HealthRow label="Low stock" value={inventorySummary?.low_stock_count ?? 0} total={inventorySummary?.total_products} tone="amber" />
                  <HealthRow label="Out of stock" value={inventorySummary?.out_of_stock_count ?? 0} total={inventorySummary?.total_products} tone="red" />
                </div>
              </>
            )}
          </Card>

          {/* Activity */}
          <Card title="Recent activity" icon={Activity} padded={false}>
            {loading ? (
              <div className="p-5 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-5" />)}</div>
            ) : activity.length === 0 ? (
              <EmptyState compact icon={Activity} title="No activity yet" description="Events appear here as requests move through the flow." />
            ) : (
              <Stagger className="divide-y divide-slate-100">
                {activity.map((e, i) => {
                  const Icon = e.icon;
                  return (
                    <StaggerItem key={`${e.text}-${i}`} className="flex items-start gap-3 px-5 py-3">
                      <span className={`mt-0.5 w-7 h-7 rounded-lg grid place-items-center shrink-0 ${ICON_TONE[e.tone] || ICON_TONE.brand}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-slate-800 leading-snug">{e.text}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{[e.sub, timeAgo(e.at)].filter(Boolean).join(' · ')}</p>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </Card>

          {/* AI nudge */}
          <button
            type="button"
            onClick={openChat}
            className="w-full text-left rounded-2xl p-5 text-white relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #2e75b6 100%)' }}
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-700" />
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <ShinyText text="InventBot AI" speed={3} color="#bfdbfe" shineColor="#fff" className="text-xs font-semibold uppercase tracking-[0.14em]" />
            </div>
            <p className="font-display font-semibold text-[15px] leading-snug">“Which items are running low this week?”</p>
            <p className="text-xs text-blue-100/70 mt-1.5">Ask in plain English — InventBot can also raise a purchase request for you.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-100 group-hover:gap-2 transition-all">
              Open assistant <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AttentionRow({ tone, icon: Icon, title, sub, onClick }) {
  const ring = { amber: 'border-amber-200 bg-amber-50/60 text-amber-700', red: 'border-red-200 bg-red-50/60 text-red-700', violet: 'border-violet-200 bg-violet-50/60 text-violet-700', blue: 'border-blue-200 bg-blue-50/60 text-blue-700' }[tone];
  return (
    <StaggerItem>
      <button type="button" onClick={onClick} className={`w-full text-left flex items-center gap-3 rounded-xl border px-3.5 py-3 transition hover:shadow-card group ${ring}`}>
        <span className="w-9 h-9 rounded-lg bg-white/80 grid place-items-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-slate-800 leading-snug">{title}</span>
          {sub && <span className="block text-xs text-slate-500 truncate mt-0.5">{sub}</span>}
        </span>
        <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
      </button>
    </StaggerItem>
  );
}

function HealthRow({ label, value, total, tone }) {
  const pct = total ? Math.max(0, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800 tabular">{Math.max(0, value)}</span>
      </div>
      <Progress value={pct} tone={tone} size="sm" />
    </div>
  );
}
