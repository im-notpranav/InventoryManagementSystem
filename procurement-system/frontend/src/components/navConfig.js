import {
  LayoutDashboard, ShoppingCart, Truck, Users, FileSearch, DoorOpen, Receipt, Store, ClipboardList,
  MessageSquare, Package, Shield, Boxes, FileText, Bell, Settings,
} from 'lucide-react';

/** Single source of truth for navigation, page titles and command palette entries. */
export const NAV = {
  Admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', hint: 'KPIs and recent activity' },
        { label: 'AI Assistant', icon: MessageSquare, to: '/chatbot', hint: 'Ask InventBot anything' },
      ],
    },
    {
      section: 'Procurement',
      items: [
        { label: 'Purchase Requests', icon: ShoppingCart, to: '/purchase-requests', hint: 'Review, approve, send RFQs' },
        { label: 'Quotations', icon: FileSearch, to: '/quotations', hint: 'Compare vendor quotes' },
        { label: 'Work Orders', icon: ClipboardList, to: '/work-orders', hint: 'Issue and track work orders' },
        { label: 'Purchase Orders', icon: FileText, to: '/purchase-orders', hint: 'PO register' },
        { label: 'Vendors', icon: Truck, to: '/vendors', hint: 'Supplier directory' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Inventory', icon: Package, to: '/inventory', hint: 'Stock levels and reorder points' },
        { label: 'Products', icon: Boxes, to: '/products', hint: 'Catalogue' },
        { label: 'Warranties', icon: Shield, to: '/warranties', hint: 'Coverage and subscriptions' },
        { label: 'Gate Entry', icon: DoorOpen, to: '/gate-entry', hint: 'Deliveries at the gate' },
        { label: 'Billing', icon: Receipt, to: '/billing', hint: 'Bills and payment release' },
      ],
    },
    {
      section: 'Administration',
      items: [{ label: 'Users & Roles', icon: Users, to: '/users', hint: 'Accounts and access' }],
    },
  ],
  'Department User': [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
        { label: 'AI Assistant', icon: MessageSquare, to: '/chatbot' },
      ],
    },
    {
      section: 'My Work',
      items: [
        { label: 'My Purchase Requests', icon: ShoppingCart, to: '/purchase-requests' },
        { label: 'Inventory', icon: Package, to: '/inventory' },
        { label: 'Warranties', icon: Shield, to: '/warranties' },
      ],
    },
  ],
  Vendor: [
    {
      section: 'Vendor',
      items: [{ label: 'My Portal', icon: Store, to: '/vendor-portal', hint: 'RFQs, work orders, deliveries' }],
    },
  ],
  Watchman: [
    {
      section: 'Security',
      items: [
        { label: 'Gate Entry', icon: DoorOpen, to: '/gate-entry' },
        { label: 'Billing', icon: Receipt, to: '/billing' },
      ],
    },
  ],
  Accountant: [
    {
      section: 'Finance',
      items: [{ label: 'Bills & Payments', icon: Receipt, to: '/billing' }],
    },
  ],
};

export const COMMON_ITEMS = [
  { label: 'Notifications', icon: Bell, to: '/notifications' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export const PAGE_META = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/products': { title: 'Products', icon: Boxes },
  '/inventory': { title: 'Inventory', icon: Package },
  '/purchase-requests': { title: 'Purchase Requests', icon: ShoppingCart },
  '/purchase-orders': { title: 'Purchase Orders', icon: FileText },
  '/vendors': { title: 'Vendors', icon: Truck },
  '/vendor-portal': { title: 'Vendor Portal', icon: Store },
  '/quotations': { title: 'Quotations', icon: FileSearch },
  '/work-orders': { title: 'Work Orders', icon: ClipboardList },
  '/warranties': { title: 'Warranties', icon: Shield },
  '/notifications': { title: 'Notifications', icon: Bell },
  '/chatbot': { title: 'AI Assistant', icon: MessageSquare },
  '/gate-entry': { title: 'Gate Entry', icon: DoorOpen },
  '/billing': { title: 'Billing', icon: Receipt },
  '/users': { title: 'Users & Roles', icon: Users },
  '/settings': { title: 'Settings', icon: Settings },
};

export const navFor = (role) => NAV[role] || NAV['Department User'];
export const flatNavFor = (role) => navFor(role).flatMap((s) => s.items);
