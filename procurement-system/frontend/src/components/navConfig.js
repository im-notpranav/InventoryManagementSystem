import {
  LayoutDashboard, ShoppingCart, Truck, Users, FileSearch, DoorOpen, Receipt, Store, ClipboardList,
  MessageSquare, Package, Shield, Boxes, Bell, Settings, PackageCheck,
} from 'lucide-react';

/** Single source of truth for navigation, page titles and command palette entries. */
export const NAV = {
  Admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', hint: 'KPIs and recent activity' },
        { label: 'Assistant', icon: MessageSquare, to: '/chatbot', hint: 'Ask about stock, orders and vendors' },
      ],
    },
    {
      section: 'Procurement',
      items: [
        { label: 'Purchase Requests', icon: ShoppingCart, to: '/purchase-requests', hint: 'Approve, send to vendors' },
        { label: 'Quotations', icon: FileSearch, to: '/quotations', hint: 'Compare quotes and pick one' },
        { label: 'Work Orders', icon: ClipboardList, to: '/work-orders', hint: 'Track deliveries' },
        { label: 'Vendors', icon: Truck, to: '/vendors', hint: 'Supplier directory' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Goods Review', icon: PackageCheck, to: '/goods-review', hint: 'Accept delivered items' },
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
        { label: 'Assistant', icon: MessageSquare, to: '/chatbot' },
      ],
    },
    {
      section: 'My Work',
      items: [
        { label: 'My Purchase Requests', icon: ShoppingCart, to: '/purchase-requests' },
        { label: 'Goods Review', icon: PackageCheck, to: '/goods-review' },
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
      items: [{ label: 'Gate Entry', icon: DoorOpen, to: '/gate-entry' }],
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
  '/goods-review': { title: 'Goods Review', icon: PackageCheck },
  '/vendors': { title: 'Vendors', icon: Truck },
  '/vendor-portal': { title: 'Vendor Portal', icon: Store },
  '/quotations': { title: 'Quotations', icon: FileSearch },
  '/work-orders': { title: 'Work Orders', icon: ClipboardList },
  '/warranties': { title: 'Warranties', icon: Shield },
  '/notifications': { title: 'Notifications', icon: Bell },
  '/chatbot': { title: 'Assistant', icon: MessageSquare },
  '/gate-entry': { title: 'Gate Entry', icon: DoorOpen },
  '/billing': { title: 'Billing', icon: Receipt },
  '/users': { title: 'Users & Roles', icon: Users },
  '/settings': { title: 'Settings', icon: Settings },
};

export const navFor = (role) => NAV[role] || NAV['Department User'];
export const flatNavFor = (role) => navFor(role).flatMap((s) => s.items);
