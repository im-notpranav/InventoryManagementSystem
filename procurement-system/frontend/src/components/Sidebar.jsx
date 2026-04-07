import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bot, LayoutDashboard, Package, Warehouse, Tag,
  ShoppingCart, Truck, FileText, Receipt, Award,
  Bell, Users, Settings, LogOut, ChevronLeft, FileSearch, Send, Building2
} from 'lucide-react'
import useAuthStore from '../store/auth.store'

// Items visible to all authenticated users
const userItems = [
  { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Products',          icon: Tag,             to: '/products' },
  { label: 'Inventory',         icon: Package,         to: '/inventory' },
  { label: 'Purchase Requests', icon: ShoppingCart,    to: '/purchase-requests' },
  { label: 'Warranties',        icon: Award,           to: '/warranties' },
  { label: 'Notifications',     icon: Bell,            to: '/notifications' },
]

// Items visible only to Admin/Manager
const adminItems = [
  { label: 'RFQ & Quotations', icon: Send,            to: '/rfq' },
  { label: 'Purchase Orders',   icon: FileText,        to: '/purchase-orders' },
  { label: 'Vendors',           icon: Truck,           to: '/vendors' },
  { label: 'Goods Receipts',    icon: Warehouse,       to: '/goods-receipts' },
  { label: 'Invoices',          icon: Receipt,         to: '/invoices' },
]

// Items visible only to Vendors
const vendorItems = [
  { label: 'Vendor Portal',     icon: Building2,       to: '/vendor-portal' },
]

// System admin items
const systemItems = [
  { label: 'Users & Roles', icon: Users,      to: '/admin/users' },
  { label: 'Audit Logs',    icon: FileSearch, to: '/admin/audit-logs' },
  { label: 'Settings',      icon: Settings,   to: '/admin/settings' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager'
  const isVendor = user?.role === 'Vendor'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 min-h-screen flex flex-col relative`}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-display text-white font-bold text-lg whitespace-nowrap">InventBot</span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition z-10"
      >
        <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {!collapsed && (
          <p className="text-blue-300/50 text-xs font-semibold uppercase tracking-wider px-5 mb-2">Main Menu</p>
        )}
        {userItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl transition-all text-sm font-medium
              ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}

        {/* Vendor Portal section - only for Vendor role */}
        {isVendor && (
          <>
            <div className="mx-5 my-3 border-t border-white/10" />
            {!collapsed && (
              <p className="text-blue-300/50 text-xs font-semibold uppercase tracking-wider px-5 mb-2">Vendor</p>
            )}
            {vendorItems.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl transition-all text-sm font-medium
                  ${isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {/* Admin/Manager modules */}
        {isAdmin && (
          <>
            <div className="mx-5 my-3 border-t border-white/10" />
            {!collapsed && (
              <p className="text-blue-300/50 text-xs font-semibold uppercase tracking-wider px-5 mb-2">Procurement</p>
            )}
            {adminItems.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl transition-all text-sm font-medium
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {/* System Admin section */}
        {user?.role === 'Admin' && (
          <>
            <div className="mx-5 my-3 border-t border-white/10" />
            {!collapsed && (
              <p className="text-blue-300/50 text-xs font-semibold uppercase tracking-wider px-5 mb-2">System</p>
            )}
            {systemItems.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl transition-all text-sm font-medium
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-blue-300/50 text-xs truncate">{user?.role || 'Role'}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-blue-200/70 hover:bg-white/5 hover:text-white transition text-sm font-medium"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
