import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatbotWidget from './ChatbotWidget';
import { PAGE_META } from './navConfig';
import { useLocalStorage, useReducedMotion } from '../hooks';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage('inventbot_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();

  const chatbotAllowed = user && ['Admin', 'Department User'].includes(user.role);
  const meta = PAGE_META[location.pathname] || { title: 'MLRIT Procurement' };

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={meta.title} onMenu={() => setMobileOpen(true)} />

        <main className="flex-1 px-3 sm:px-6 lg:px-8 pb-8 pt-4">
          {/* Enter-only fade: no exit animation, so a click shows the next page
              at once instead of waiting for the old one to fade out. */}
          <motion.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[1440px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {chatbotAllowed && !location.pathname.startsWith('/vendor-portal') && !location.pathname.startsWith('/chatbot') ? <ChatbotWidget /> : null}
    </div>
  );
}
