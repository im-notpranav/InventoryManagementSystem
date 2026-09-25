import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCheck, Check, Inbox, Filter } from 'lucide-react';
import { notificationsApi } from '../../api/index.js';
import { PageHeader, StatCard, Button, FilterChips, Badge, EmptyState, ErrorState, Stagger, StaggerItem, useToast } from '../../components/ui';
import { DOT } from '../../components/ui/Badge';
import { dataOf, errMsg, timeAgo, fmtDateTime, titleCase, cn } from '../../lib/utils';

const toneFor = (type = '') => {
  const t = String(type).toLowerCase();
  if (t.includes('approv')) return 'emerald';
  if (t.includes('reject') || t.includes('block') || t.includes('mismatch')) return 'red';
  if (t.includes('stock') || t.includes('expir') || t.includes('warrant')) return 'amber';
  if (t.includes('rfq') || t.includes('quot')) return 'violet';
  if (t.includes('order') || t.includes('dispatch')) return 'blue';
  if (t.includes('bill') || t.includes('pay')) return 'pink';
  return 'brand';
};

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(dataOf(await notificationsApi.getAll()));
    } catch (e) {
      setError(errMsg(e, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const types = useMemo(() => {
    const c = {};
    items.forEach((n) => {
      c[n.type] = (c[n.type] || 0) + 1;
    });
    return c;
  }, [items]);

  const unread = items.filter((n) => !n.is_read).length;
  const filtered = items.filter((n) => (filter === 'all' || (filter === 'unread' ? !n.is_read : n.is_read)) && (typeFilter === 'all' || n.type === typeFilter));

  const markRead = async (n) => {
    if (n.is_read) return;
    setItems((l) => l.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)));
    try {
      await notificationsApi.markRead(n.notification_id);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const markAll = async () => {
    setItems((l) => l.map((x) => ({ ...x, is_read: true })));
    try {
      await notificationsApi.markAllRead();
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  // Group by day
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((n) => {
      const d = new Date(n.sent_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const key = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === yesterday.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    });
    return [...map.entries()];
  }, [filtered]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Approvals, stock alerts, RFQs and billing updates — the same feed you get by email." icon={Bell} actions={<Button variant="secondary" icon={CheckCheck} onClick={markAll} disabled={!unread}>Mark all read</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} loading={loading} label="Unread" value={unread} icon={Bell} tone={unread ? 'amber' : 'emerald'} active={filter === 'unread'} onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')} />
        <StatCard index={1} loading={loading} label="Total (last 50)" value={items.length} icon={Inbox} tone="brand" active={filter === 'all'} onClick={() => setFilter('all')} />
        <StatCard index={2} loading={loading} label="Types" value={Object.keys(types).length} icon={Filter} tone="violet" />
        <StatCard index={3} loading={loading} label="Today" value={items.filter((n) => new Date(n.sent_at).toDateString() === new Date().toDateString()).length} icon={Check} tone="teal" />
      </div>

      <div className="surface p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
        <FilterChips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: items.length }, { value: 'unread', label: 'Unread', count: unread, dot: 'bg-amber-500' }, { value: 'read', label: 'Read', count: items.length - unread }]} />
        <span className="hidden sm:block w-px bg-slate-200 self-stretch" />
        <FilterChips value={typeFilter} onChange={setTypeFilter} options={[{ value: 'all', label: 'Every type' }, ...Object.entries(types).map(([t, c]) => ({ value: t, label: titleCase(t), count: c, dot: DOT[toneFor(t)] }))]} />
      </div>

      {loading ? (
        <div className="surface p-5 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-14" />)}</div>
      ) : groups.length === 0 ? (
        <div className="surface"><EmptyState icon={Bell} title={items.length ? 'Nothing matches these filters' : "You're all caught up"} description={items.length ? 'Try a different filter.' : 'New notifications will appear here as things happen.'} /></div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, list]) => (
            <section key={day}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2 px-1">{day}</p>
              <Stagger className="surface divide-y divide-slate-100 overflow-hidden">
                <AnimatePresence initial={false}>
                  {list.map((n) => {
                    const tone = toneFor(n.type);
                    return (
                      <StaggerItem key={n.notification_id}>
                        <button type="button" onClick={() => markRead(n)} className={cn('w-full text-left flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50', !n.is_read && 'bg-brand-50/30')}>
                          <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.is_read ? 'bg-transparent' : DOT[tone])} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge tone={tone} size="xs">{titleCase(n.type)}</Badge>
                              <span className="text-[11px] text-slate-400" title={fmtDateTime(n.sent_at)}>{timeAgo(n.sent_at)}</span>
                            </div>
                            <p className={cn('text-sm mt-1 leading-relaxed', n.is_read ? 'text-slate-600' : 'text-slate-900 font-medium')}>{n.message}</p>
                          </div>
                          {!n.is_read && <span className="text-[11px] text-brand-700 font-medium shrink-0 mt-1 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Mark read</span>}
                        </button>
                      </StaggerItem>
                    );
                  })}
                </AnimatePresence>
              </Stagger>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
