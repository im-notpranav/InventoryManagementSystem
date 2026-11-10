import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLE_HOMES } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import DashboardLayout from './components/DashboardLayout';
import { RouteLoader } from './components/brand/Brand';
import Login from './pages/auth/Login';

// Code-split every portal page so the login screen stays light. The importers
// are kept so prefetchPages() can warm the chunks once the user is signed in.
const PAGES = {
  Dashboard: () => import('./pages/dashboard/Dashboard'),
  InventoryPage: () => import('./pages/inventory/Inventory'),
  ProductsPage: () => import('./pages/products/ProductsPage'),
  VendorsPage: () => import('./pages/vendors/VendorsPage'),
  PurchaseRequestPage: () => import('./pages/purchase-requests/PurchaseRequestPage'),
  GoodsReviewPage: () => import('./pages/goods-review/GoodsReview'),
  WorkOrderPrintPage: () => import('./pages/work-orders/WorkOrderPrint'),
  VendorInvitePage: () => import('./pages/auth/VendorInvite'),
  QuotationsPage: () => import('./pages/quotations/QuotationsPage'),
  UsersPage: () => import('./pages/users/UsersPage'),
  ChatbotPage: () => import('./pages/chatbot/Chatbot'),
  VendorPortalPage: () => import('./pages/vendor-portal/VendorPortal'),
  GateEntryPage: () => import('./pages/gate-entry/GateEntry'),
  BillingPage: () => import('./pages/billing/Billing'),
  WorkOrdersPage: () => import('./pages/work-orders/WorkOrders'),
  WarrantiesPage: () => import('./pages/warranties/Warranties'),
  NotificationsPage: () => import('./pages/notifications/NotificationsPage'),
  SettingsPage: () => import('./pages/settings/SettingsPage'),
};

// Pages each role can open, most used first (prefetch order).
const ROLE_PAGES = {
  Admin: ['Dashboard', 'PurchaseRequestPage', 'QuotationsPage', 'WorkOrdersPage', 'GoodsReviewPage', 'InventoryPage', 'WarrantiesPage', 'BillingPage', 'VendorsPage', 'ProductsPage', 'UsersPage', 'GateEntryPage', 'ChatbotPage', 'NotificationsPage', 'SettingsPage'],
  'Department User': ['Dashboard', 'PurchaseRequestPage', 'GoodsReviewPage', 'InventoryPage', 'WarrantiesPage', 'ChatbotPage', 'NotificationsPage', 'SettingsPage'],
  Vendor: ['VendorPortalPage', 'NotificationsPage', 'SettingsPage'],
  Watchman: ['GateEntryPage', 'NotificationsPage', 'SettingsPage'],
  Accountant: ['BillingPage', 'NotificationsPage', 'SettingsPage'],
};

const prefetched = new Set();
/** Download a role's page chunks in the background, one at a time, when the browser is idle. */
export function prefetchPages(role) {
  const queue = (ROLE_PAGES[role] || []).filter((name) => !prefetched.has(name));
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  const next = () => {
    const name = queue.shift();
    if (!name) return;
    prefetched.add(name);
    PAGES[name]().catch(() => prefetched.delete(name)).finally(() => idle(next));
  };
  idle(next);
}

const {
  Dashboard, InventoryPage, ProductsPage, VendorsPage, PurchaseRequestPage, GoodsReviewPage, WorkOrderPrintPage,
  VendorInvitePage, QuotationsPage, UsersPage, ChatbotPage, VendorPortalPage, GateEntryPage, BillingPage,
  WorkOrdersPage, WarrantiesPage, NotificationsPage, SettingsPage,
} = Object.fromEntries(Object.entries(PAGES).map(([name, load]) => [name, lazy(load)]));

const ALL_ROLES = ['Admin', 'Department User', 'Vendor', 'Watchman', 'Accountant'];

function RoleBasedRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
}

const page = (roles, element) => (
  <RequireRole roles={roles}>
    <Suspense fallback={<RouteLoader />}>{element}</Suspense>
  </RequireRole>
);

export default function AppRouter() {
  const { user } = useAuth();
  // Signed in: warm this role's page chunks so later navigation skips the loader.
  useEffect(() => {
    if (user?.role) prefetchPages(user.role);
  }, [user?.role]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/users" element={<Navigate to="/users" replace />} />
      <Route path="/vendor-invite/:token" element={<Suspense fallback={<RouteLoader />}><VendorInvitePage /></Suspense>} />
      <Route
        path="/work-orders/:id/print"
        element={<ProtectedRoute>{page(['Admin', 'Department User', 'Vendor', 'Accountant'], <WorkOrderPrintPage />)}</ProtectedRoute>}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />

        <Route path="dashboard" element={page(['Admin', 'Department User'], <Dashboard />)} />
        <Route path="purchase-requests" element={page(['Admin', 'Department User'], <PurchaseRequestPage />)} />
        <Route path="vendors" element={page(['Admin'], <VendorsPage />)} />
        <Route path="quotations" element={page(['Admin'], <QuotationsPage />)} />
        <Route path="work-orders" element={page(['Admin'], <WorkOrdersPage />)} />
        <Route path="inventory" element={page(['Admin', 'Department User'], <InventoryPage />)} />
        <Route path="warranties" element={page(['Admin', 'Department User'], <WarrantiesPage />)} />
        <Route path="products" element={page(['Admin'], <ProductsPage />)} />
        <Route path="goods-review" element={page(['Admin', 'Department User'], <GoodsReviewPage />)} />
        <Route path="users" element={page(['Admin'], <UsersPage />)} />
        <Route path="chatbot" element={page(['Admin', 'Department User'], <ChatbotPage />)} />
        <Route path="vendor-portal" element={page(['Vendor'], <VendorPortalPage />)} />
        <Route path="gate-entry" element={page(['Watchman', 'Admin'], <GateEntryPage />)} />
        <Route path="billing" element={page(['Admin', 'Accountant'], <BillingPage />)} />
        <Route path="notifications" element={page(ALL_ROLES, <NotificationsPage />)} />
        <Route path="settings" element={page(ALL_ROLES, <SettingsPage />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
