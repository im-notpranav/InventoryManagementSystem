import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatbotWidget from './ChatbotWidget';
import Dock from './reactbits/Dock/Dock';
import ClickSpark from './reactbits/ClickSpark/ClickSpark';
import { PAGE_META, flatNavFor } from './navConfig';
import { useLocalStorage, useMediaQuery, useReducedMotion } from '../hooks';
import { cn } from '../lib/utils';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage('inventbot_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const chatbotAllowed = user && ['Admin', 'Department User'].includes(user.role);
  const meta = PAGE_META[location.pathname] || { title: 'InventBot' };

  // Bottom dock on small screens: first 5 nav items for this role
  const dockItems = flatNavFor(user?.role)
    .slice(0, 5)
    .map((item) => {
      const Icon = item.icon;
      const active = location.pathname === item.to;
      return {
        icon: <Icon className={cn('w-5 h-5', active ? 'text-brand-700' : 'text-slate-500')} />,
        label: item.label,
        onClick: () => navigate(item.to),
        className: cn('!bg-white !border-slate-200', active && '!border-brand-400 !bg-brand-50'),
      };
    });

  return (
    <div className="flex min-h-screen bg-[var(--invent-bg)]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* soft ambient background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(1200px 500px at 20% -10%, rgba(46,117,182,0.08), transparent 60%), radial-gradient(900px 400px at 100% 0%, rgba(79,143,192,0.08), transparent 55%)',
          }}
        />
        <Topbar title={meta.title} icon={meta.icon} onMenu={() => setMobileOpen(true)} />

        <ClickSpark sparkColor="#2e75b6" sparkSize={9} sparkRadius={18} sparkCount={8} duration={420}>
          <main className={cn('relative z-[1] flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8', isMobile && 'pb-28')}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-[1440px]"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </ClickSpark>

        {/* Mobile dock */}
        {isMobile && dockItems.length > 1 && (
          <div className="fixed bottom-0 inset-x-0 z-40 h-[92px] pointer-events-none lg:hidden">
            <div className="pointer-events-auto relative h-full">
              <Dock items={dockItems} panelHeight={64} baseItemSize={46} magnification={60} distance={120} className="!border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-pop" />
            </div>
          </div>
        )}
      </div>

      {chatbotAllowed && !location.pathname.startsWith('/vendor-portal') && !location.pathname.startsWith('/chatbot') ? <ChatbotWidget /> : null}
    </div>
  );
}
