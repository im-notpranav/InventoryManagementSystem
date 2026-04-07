import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatbotWidget from './ChatbotWidget';

const pageTitles = {
  '/dashboard':          'Dashboard',
  '/products':           'Products',
  '/inventory':          'Inventory',
  '/purchase-requests':  'Purchase Requests',
  '/purchase-orders':    'Purchase Orders',
  '/vendors':            'Vendors',
  '/vendor-portal':      'Vendor Portal',
  '/goods-receipts':     'Goods Receipts',
  '/invoices':           'Invoices',
  '/warranties':         'Warranties',
  '/notifications':      'Notifications',
  '/chatbot':            'AI Chatbot',
  '/admin/users':        'Users & Roles',
  '/admin/settings':     'Settings',
};

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'InventBot';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}
