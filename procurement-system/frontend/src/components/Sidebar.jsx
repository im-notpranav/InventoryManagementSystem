import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, LogOut, ChevronLeft, Settings, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { navFor } from './navConfig';
import Avatar from './ui/Avatar';
import ShinyText from './reactbits/ShinyText/ShinyText';
import { cn } from '../lib/utils';

const ROLE_TAGLINE = {
  Admin: 'Administrator',
  'Department User': 'Department',
  Vendor: 'Supplier partner',
  Watchman: 'Security desk',
  Accountant: 'Accounts',
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pendingBills, setPendingBills] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [tip, setTip] = useState(null); // { label, top }

  // Accountant badge: pending bills
  useEffect(() => {
    if (user?.role !== 'Accountant' && user?.role !== 'Admin') return undefined;
    let active = true;
    const load = async () => {
      try {
        const r = await api.get('/billing/pending');
        if (active) setPendingBills((r.data?.data || []).length);
      } catch {
        if (active) setPendingBills(0);
      }
    };
    load();
    const id = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [user?.role]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen?.(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = navFor(user?.role);
  const badgeFor = (to) => (to === '/billing' && ['Accountant', 'Admin'].includes(user?.role) ? pendingBills : 0);

  const body = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 h-[68px] border-b border-white/[0.07]', collapsed && 'justify-center px-0')}>
        <div className="relative w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-gradient-to-br from-brand-500 to-brand-400 shadow-[0_8px_20px_-6px_rgba(46,117,182,0.7)]">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f172a]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <ShinyText text="InventBot" speed={4} color="#dbeafe" shineColor="#ffffff" className="font-display text-lg font-bold leading-none" />
            <p className="text-[10px] uppercase tracking-[0.14em] text-blue-200/50 mt-1">{ROLE_TAGLINE[user?.role] || user?.role}</p>
          </div>
        )}
        {setMobileOpen && (
          <button type="button" onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden w-8 h-8 rounded-lg grid place-items-center text-blue-200/70 hover:bg-white/10 hover:text-white" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-4 px-2.5 space-y-5" aria-label="Main">
        {sections.map((section) => (
          <div key={section.section}>
            {!collapsed ? (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/40">{section.section}</p>
            ) : (
              <div className="mx-3 mb-2 border-t border-white/[0.07]" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const badge = badgeFor(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to} className="relative">
                    <NavLink
                      to={item.to}
                      onMouseEnter={(e) => {
                        setHovered(item.to);
                        const r = e.currentTarget.getBoundingClientRect();
                        setTip({ label: item.label, top: r.top + r.height / 2, left: r.right });
                      }}
                      onMouseLeave={() => {
                        setHovered(null);
                        setTip(null);
                      }}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-colors duration-200',
                          collapsed ? 'justify-center h-11 w-11 mx-auto' : 'px-3 h-10',
                          isActive ? 'text-white' : 'text-blue-100/60 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-active"
                              className="absolute inset-0 rounded-xl bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                            />
                          )}
                          {!isActive && hovered === item.to && <span className="absolute inset-0 rounded-xl bg-white/[0.05]" />}
                          {isActive && !collapsed && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-brand-300" />}
                          <Icon className={cn('relative z-10 w-[18px] h-[18px] shrink-0 transition-transform duration-200', isActive ? 'text-brand-200' : 'group-hover:scale-110')} />
                          {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                          {badge > 0 && (
                            <span
                              className={cn(
                                'relative z-10 rounded-full bg-red-500 text-white text-[10px] font-bold tabular grid place-items-center',
                                collapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4' : 'ml-auto px-1.5 h-[18px] min-w-[18px]',
                              )}
                            >
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/[0.07]">
        <div className={cn('rounded-2xl bg-white/[0.05] border border-white/[0.06] p-2.5', collapsed && 'p-1.5')}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <Avatar name={user?.name} size="md" solid />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-white text-[13px] font-semibold truncate leading-tight">{user?.name || 'User'}</p>
                <p className="text-[11px] text-blue-200/50 truncate">{user?.email || ''}</p>
              </div>
            )}
          </div>
          <div className={cn('mt-2 grid gap-1', collapsed ? 'grid-cols-1' : 'grid-cols-2')}>
            <NavLink
              to="/settings"
              className={cn('flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-medium text-blue-100/70 hover:text-white hover:bg-white/10 transition', collapsed && 'w-full')}
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              {!collapsed && 'Settings'}
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-medium text-blue-100/70 hover:text-white hover:bg-red-500/80 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!collapsed && 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 84 : 264 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="hidden lg:flex flex-col relative shrink-0 h-screen sticky top-0 text-white"
        style={{ background: 'linear-gradient(180deg, #0b1324 0%, #0f172a 35%, #1e3a5f 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(79,143,192,0.35), transparent 45%), radial-gradient(circle at 80% 100%, rgba(46,117,182,0.25), transparent 45%)' }} />
        <div className="relative z-10 h-full">{body}</div>
        <AnimatePresence>
          {collapsed && tip && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.12 }}
              style={{ top: tip.top, left: tip.left + 12 }}
              className="pointer-events-none fixed -translate-y-1/2 z-[80] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-pop border border-white/10"
            >
              {tip.label}
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900 border-l border-b border-white/10" />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[26px] z-20 w-6 h-6 rounded-full grid place-items-center bg-brand-500 text-white shadow-card hover:bg-brand-400 transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('w-3 h-3 transition-transform duration-300', collapsed && 'rotate-180')} />
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-[95] w-[272px] lg:hidden text-white shadow-pop"
              style={{ background: 'linear-gradient(180deg, #0b1324 0%, #0f172a 35%, #1e3a5f 100%)' }}
            >
              {body}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
