import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/auth.store'
import Login from './pages/auth/Login'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/dashboard/Dashboard'
import InventoryPage from './pages/inventory/InventoryPage'
import ProductsPage from './pages/products/ProductsPage'
import VendorsPage from './pages/vendors/VendorsPage'
import VendorPortalPage from './pages/vendors/VendorPortalPage.new'
import PurchaseRequestPage from './pages/purchase-requests/PurchaseRequestPage'
import RFQPage from './pages/purchase-requests/RFQPage'
import PurchaseOrderPage from './pages/purchase-orders/PurchaseOrderPage'
import GoodsReceiptPage from './pages/goods-receipts/GoodsReceiptPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import WarrantiesPage from './pages/warranties/WarrantiesPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import UsersPage from './pages/users/UsersPage'
import AuditLogsPage from './pages/users/AuditLogsPage'
import SettingsPage from './pages/settings/SettingsPage'
import ChatbotPage from './pages/chatbot/ChatbotPage'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function VendorRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  // Only Vendor role can access vendor portal
  if (!user || user.role !== 'Vendor') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard"          element={<Dashboard />} />
        <Route path="inventory"          element={<InventoryPage />} />
        <Route path="products"           element={<ProductsPage />} />
        <Route path="purchase-requests"  element={<PurchaseRequestPage />} />
        <Route path="warranties"         element={<WarrantiesPage />} />
        <Route path="notifications"      element={<NotificationsPage />} />
        <Route path="chatbot"            element={<ChatbotPage />} />
        
        {/* Vendor Portal - for users with Vendor role */}
        <Route path="vendor-portal" element={<VendorRoute><VendorPortalPage /></VendorRoute>} />
        <Route path="vendor-portal/:orderId" element={<VendorRoute><VendorPortalPage /></VendorRoute>} />
        
        {/* Admin/Manager only routes */}
        <Route path="rfq"             element={<AdminRoute><RFQPage /></AdminRoute>} />
        <Route path="purchase-orders" element={<AdminRoute><PurchaseOrderPage /></AdminRoute>} />
        <Route path="vendors"         element={<AdminRoute><VendorsPage /></AdminRoute>} />
        <Route path="goods-receipts"  element={<AdminRoute><GoodsReceiptPage /></AdminRoute>} />
        <Route path="invoices"        element={<AdminRoute><InvoicesPage /></AdminRoute>} />
        
        {/* Admin only routes */}
        <Route path="admin/users"      element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="admin/audit-logs" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
        <Route path="admin/settings"   element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>
    </Routes>
  )
}
