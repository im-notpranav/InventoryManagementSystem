import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, PanelLeft, Settings, X, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { navFor } from './navConfig';
import Avatar from './ui/Avatar';
import { MlritMark } from './brand/Brand';
import { useDismiss, usePolling } from '../hooks';
import { cn } from '../lib/utils';

const ROLE_PORTAL = {
  Admin: 'Admin portal',
  'Department User': 'Department portal',
  Vendor: 'Vendor portal',
  Watchman: 'Security portal',
  Accountant: 'Accounts portal',
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pendingBills, setPendingBills] = useState(0);
  const [tip, setTip] = useState(null); // { label, top, left }
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useDismiss(menuRef, () => setMenuOpen(false), menuOpen);

  // Pending bills badge for Accountant / Admin
  const billsBadge = user?.role === 'Accountant' || user?.role === 'Admin';
  usePolling(async () => {
    try {
      const r = await api.get('/billing', { params: { status: user?.role === 'Accountant' ? 'reviewed,bill_approved' : 'reviewed' } });
      setPendingBills((r.data?.data || []).length);
    } catch {
      setPendingBills(0);
    }
  }, 45000, billsBadge);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen?.(false);
    setMenuOpen(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = navFor(user?.role);
  const badgeFor = (to) => (to === '/billing' && ['Accountant', 'Admin'].includes(user?.role) ? pendingBills : 0);

  const body = (mobile) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 pt-4 pb-3', collapsed && !mobile && 'justify-center px-0')}>
        <MlritMark className="w-10 h-10 shrink-0" />
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-slate-900 leading-tight">MLRIT Procurement</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mt-0.5">{ROLE_PORTAL[user?.role] || 'Portal'}</p>
          </div>
        )}
        {mobile && (
          <button type="button" onClick={() => setMobileOpen(false)} className="ml-auto w-8 h-8 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 pt-2 pb-4 space-y-5" aria-label="Main">
        {sections.map((section) => (
          <div key={section.section}>
            {!collapsed || mobile ? (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{section.section}</p>
            ) : (
              <div className="mx-3 mb-2 border-t border-slate-200" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const badge = badgeFor(item.to);
                const Icon = item.icon;
                const iconOnly = collapsed && !mobile;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onMouseEnter={(e) => {
                        if (!iconOnly) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setTip({ label: item.label, top: r.top + r.height / 2, left: r.right });
                      }}
                      onMouseLeave={() => setTip(null)}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center gap-3 rounded-xl text-[14px] transition-colors duration-150',
                          iconOnly ? 'justify-center h-11 w-11 mx-auto' : 'px-3 h-11',
                          isActive ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900',
                        )
                      }
                    >
                      <Icon className="w-[19px] h-[19px] shrink-0" strokeWidth={1.8} />
                      {!iconOnly && <span className="truncate">{item.label}</span>}
                      {badge > 0 &&
                        (iconOnly ? (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500" />
                        ) : (
                          <span className="ml-auto rounded-full bg-brand-500 text-white text-[10px] font-bold tabular px-1.5 h-[18px] min-w-[18px] grid place-items-center">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ))}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse */}
      {!mobile && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 rounded-lg grid place-items-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* User */}
      <div className="relative border-t border-slate-200 p-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn('w-full flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100 transition-colors text-left', collapsed && !mobile && 'justify-center')}
          aria-expanded={menuOpen}
        >
          <Avatar name={user?.name} size="md" solid />
          {(!collapsed || mobile) && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-slate-900 truncate uppercase">{user?.name || 'User'}</span>
                <span className="block text-[11px] text-slate-500 truncate">{user?.email || ''}</span>
              </span>
              <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            </>
          )}
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.14 }}
              className={cn('absolute bottom-full mb-2 z-50 w-52 rounded-xl border border-slate-200 bg-surface shadow-pop p-1', collapsed && !mobile ? 'left-full ml-2 bottom-3 mb-0' : 'left-3 right-3 w-auto')}
            >
              <NavLink to="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
                <Settings className="w-4 h-4 text-slate-500" /> Settings
              </NavLink>
              <button type="button" onClick={logout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: floating card */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen p-3 pr-0">
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 80 : 252 }}
          transition={{ type: 'spring', stiffness: 360, damping: 38 }}
          className="h-full rounded-2xl border border-slate-200 bg-surface shadow-card overflow-hidden"
        >
          {body(false)}
        </motion.aside>
        <AnimatePresence>
          {collapsed && tip && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.12 }}
              style={{ top: tip.top, left: tip.left + 10 }}
              className="pointer-events-none fixed -translate-y-1/2 z-[80] whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-canvas shadow-pop"
            >
              {tip.label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-2 left-2 z-[95] w-[272px] rounded-2xl border border-slate-200 bg-surface shadow-pop lg:hidden"
            >
              {body(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
