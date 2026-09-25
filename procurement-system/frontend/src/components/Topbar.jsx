import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, Bot, Menu, Check, CheckCheck, ArrowRight, Command, Settings, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useChatbotStore from '../store/chatbot.store';
import { notificationsApi } from '../api/index.js';
import { flatNavFor, COMMON_ITEMS } from './navConfig';
import Avatar from './ui/Avatar';
import Badge, { DOT } from './ui/Badge';
import { useDismiss, useHotkey } from '../hooks';
import { cn, timeAgo, titleCase } from '../lib/utils';

const NOTIF_TONE = {
  approval: 'emerald',
  rejection: 'red',
  low_stock: 'amber',
  warranty: 'violet',
  rfq: 'blue',
  work_order: 'indigo',
  gate: 'teal',
  billing: 'pink',
};

function toneFor(type = '') {
  const t = String(type).toLowerCase();
  for (const key of Object.keys(NOTIF_TONE)) if (t.includes(key.replace('_', '')) || t.includes(key)) return NOTIF_TONE[key];
  if (t.includes('approv')) return 'emerald';
  if (t.includes('reject') || t.includes('block')) return 'red';
  if (t.includes('stock') || t.includes('expir')) return 'amber';
  return 'brand';
}

export default function Topbar({ title, icon: Icon, onMenu, children }) {
  const { user, logout } = useAuth();
  const openChatbot = useChatbotStore((s) => s.open);
  const navigate = useNavigate();

  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const unread = notifs.filter((n) => !n.is_read).length;
  const chatbotAllowed = ['Admin', 'Department User'].includes(user?.role);

  const loadNotifs = useCallback(async () => {
    try {
      const r = await notificationsApi.getAll();
      const list = r?.data?.data;
      if (Array.isArray(list)) setNotifs(list);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 30000);
    return () => clearInterval(id);
  }, [loadNotifs]);

  useDismiss(notifRef, () => setNotifOpen(false), notifOpen);
  useDismiss(userRef, () => setUserOpen(false), userOpen);
  useHotkey('k', () => setPaletteOpen((o) => !o));

  const markRead = async (n) => {
    if (n.is_read) return;
    setNotifs((l) => l.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)));
    try {
      await notificationsApi.markRead(n.notification_id);
    } catch {
      /* ignore */
    }
  };
  const markAll = async () => {
    setNotifs((l) => l.map((x) => ({ ...x, is_read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-[68px] shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <button type="button" onClick={onMenu} className="lg:hidden w-10 h-10 -ml-2 rounded-xl grid place-items-center text-slate-600 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {Icon && (
            <div className="hidden sm:grid w-9 h-9 rounded-xl bg-brand-50 text-brand-700 place-items-center shrink-0">
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="font-display text-[15px] sm:text-lg font-semibold text-slate-900 truncate min-w-0"
            >
              {title}
            </motion.h1>
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          {children}
          {/* Command palette trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-10 pl-3 pr-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-transparent hover:border-slate-200 text-sm text-slate-500 transition w-56 lg:w-64"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Jump to…</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
          <button type="button" onClick={() => setPaletteOpen(true)} className="md:hidden w-10 h-10 rounded-xl grid place-items-center text-slate-600 hover:bg-slate-100" aria-label="Search">
            <Search className="w-[18px] h-[18px]" />
          </button>

          {chatbotAllowed && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={openChatbot}
              className="relative w-10 h-10 rounded-xl grid place-items-center text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
              title="Ask InventBot"
            >
              <Bot className="w-[18px] h-[18px]" />
              <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-400" />
            </motion.button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className={cn('relative w-10 h-10 rounded-xl grid place-items-center transition', notifOpen ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100')}
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unread > 0 && (
                <motion.span
                  key={unread}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-white tabular"
                >
                  {unread > 9 ? '9+' : unread}
                </motion.span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-[min(92vw,380px)] rounded-2xl bg-white border border-slate-200 shadow-pop overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-slate-900 text-sm">Notifications</p>
                      {unread > 0 && <Badge tone="red" size="xs">{unread} new</Badge>}
                    </div>
                    <button type="button" onClick={markAll} disabled={!unread} className="text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-40 flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">You're all caught up</p>
                      </div>
                    ) : (
                      notifs.slice(0, 20).map((n) => {
                        const tone = toneFor(n.type);
                        return (
                          <button
                            key={n.notification_id}
                            type="button"
                            onClick={() => markRead(n)}
                            className={cn('w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition', !n.is_read && 'bg-brand-50/40')}
                          >
                            <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', !n.is_read ? DOT[tone] || DOT.brand : 'bg-transparent')} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge tone={tone} size="xs">{titleCase(n.type)}</Badge>
                                <span className="text-[11px] text-slate-400 ml-auto shrink-0">{timeAgo(n.sent_at)}</span>
                              </div>
                              <p className={cn('text-[13px] mt-1 leading-snug', n.is_read ? 'text-slate-600' : 'text-slate-800 font-medium')}>{n.message}</p>
                            </div>
                            {!n.is_read && <Check className="w-4 h-4 text-slate-300 shrink-0 mt-1" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/notifications');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-600 hover:text-brand-700 hover:bg-slate-50 border-t border-slate-100"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((o) => !o)}
              className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl hover:bg-slate-100 transition"
              aria-expanded={userOpen}
            >
              <Avatar name={user?.name} size="sm" solid />
              <div className="hidden xl:block text-left leading-tight">
                <p className="text-[13px] font-semibold text-slate-800 max-w-[140px] truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500">{user?.role}</p>
              </div>
              <ChevronDown className="hidden xl:block w-4 h-4 text-slate-400" />
            </button>
            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-pop overflow-hidden z-50 p-1.5"
                >
                  <div className="flex items-center gap-3 px-2.5 py-2.5">
                    <Avatar name={user?.name} size="md" solid />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setUserOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <Settings className="w-4 h-4 text-slate-500" /> Account settings
                  </button>
                  <button type="button" onClick={logout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} role={user?.role} onOpenChat={chatbotAllowed ? openChatbot : null} />
    </>
  );
}

/* ───────────────────────── Command palette (Ctrl/⌘+K) ───────────────────────── */
function CommandPalette({ open, onClose, role, onOpenChat }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const nav = [...flatNavFor(role), ...COMMON_ITEMS].map((i) => ({ ...i, kind: 'Page' }));
    const actions = [];
    if (onOpenChat) actions.push({ label: 'Ask InventBot AI', icon: Bot, kind: 'Action', run: onOpenChat });
    return [...nav, ...actions];
  }, [role, onOpenChat]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.label.toLowerCase().includes(s) || i.hint?.toLowerCase().includes(s) || i.to?.includes(s));
  }, [items, q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setIdx(0), [q]);

  const run = (item) => {
    onClose();
    if (item.run) item.run();
    else if (item.to) navigate(item.to);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[idx]) {
      e.preventDefault();
      run(filtered[idx]);
    } else if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-[3px] flex items-start justify-center pt-[12vh] px-4"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="w-full max-w-xl rounded-2xl bg-white shadow-pop border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search pages and actions…"
                className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No matches for “{q}”</p>
              ) : (
                filtered.map((item, i) => {
                  const ItemIcon = item.icon;
                  const active = i === idx;
                  return (
                    <button
                      key={`${item.kind}-${item.label}`}
                      type="button"
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => run(item)}
                      className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors', active ? 'bg-brand-50' : 'hover:bg-slate-50')}
                    >
                      <span className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0', active ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600')}>
                        <ItemIcon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                        {item.hint && <span className="block text-xs text-slate-500 truncate">{item.hint}</span>}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">{item.kind}</span>
                      {active && <ArrowRight className="w-4 h-4 text-brand-600" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 flex gap-4">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open</span>
              <span className="ml-auto">Ctrl / ⌘ + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
