import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLE_HOMES } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import DashboardLayout from './components/DashboardLayout';
import { PageSkeleton } from './components/ui';
import Login from './pages/auth/Login';

// Code-split every portal page so the login screen stays light.
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const InventoryPage = lazy(() => import('./pages/inventory/Inventory'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const VendorsPage = lazy(() => import('./pages/vendors/VendorsPage'));
const PurchaseRequestPage = lazy(() => import('./pages/purchase-requests/PurchaseRequestPage'));
const PurchaseOrderPage = lazy(() => import('./pages/purchase-orders/PurchaseOrderPage'));
const QuotationsPage = lazy(() => import('./pages/quotations/QuotationsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const ChatbotPage = lazy(() => import('./pages/chatbot/Chatbot'));
const VendorPortalPage = lazy(() => import('./pages/vendor-portal/VendorPortal'));
const GateEntryPage = lazy(() => import('./pages/gate-entry/GateEntry'));
const BillingPage = lazy(() => import('./pages/billing/Billing'));
const WorkOrdersPage = lazy(() => import('./pages/work-orders/WorkOrders'));
const WarrantiesPage = lazy(() => import('./pages/warranties/Warranties'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

const ALL_ROLES = ['Admin', 'Department User', 'Vendor', 'Watchman', 'Accountant'];

function RoleBasedRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton stats={0} />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
}

const page = (roles, element) => (
  <RequireRole roles={roles}>
    <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
  </RequireRole>
);

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/users" element={<Navigate to="/users" replace />} />

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
        <Route path="purchase-orders" element={page(['Admin'], <PurchaseOrderPage />)} />
        <Route path="users" element={page(['Admin'], <UsersPage />)} />
        <Route path="chatbot" element={page(['Admin', 'Department User'], <ChatbotPage />)} />
        <Route path="vendor-portal" element={page(['Vendor'], <VendorPortalPage />)} />
        <Route path="gate-entry" element={page(['Watchman', 'Admin'], <GateEntryPage />)} />
        <Route path="billing" element={page(['Admin', 'Accountant', 'Watchman'], <BillingPage />)} />
        <Route path="notifications" element={page(ALL_ROLES, <NotificationsPage />)} />
        <Route path="settings" element={page(ALL_ROLES, <SettingsPage />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
