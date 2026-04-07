import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, ShoppingCart, Truck, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Clock, CheckCircle, ArrowRight, Bot
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useAuthStore from '../../store/auth.store';
import { inventoryApi, purchaseRequestsApi } from '../../api/index.js';

// Demo chart data (used when API not connected)
const trendData = [
  { month: 'Jan', inventory: 420, orders: 12 },
  { month: 'Feb', inventory: 380, orders: 19 },
  { month: 'Mar', inventory: 450, orders: 15 },
  { month: 'Apr', inventory: 410, orders: 22 },
  { month: 'May', inventory: 520, orders: 18 },
  { month: 'Jun', inventory: 480, orders: 25 },
  { month: 'Jul', inventory: 560, orders: 20 },
];

const activityData = [
  { day: 'Mon', purchases: 4, receipts: 2 },
  { day: 'Tue', purchases: 6, receipts: 3 },
  { day: 'Wed', purchases: 3, receipts: 5 },
  { day: 'Thu', purchases: 8, receipts: 4 },
  { day: 'Fri', purchases: 5, receipts: 6 },
];

const demoRecentOrders = [
  { id: 1, orderNo: 'PO-1042', vendor: { name: 'TechSupply Co.' }, totalAmount: 120000, status: 'Sent', createdAt: '2024-03-28' },
  { id: 2, orderNo: 'PO-1041', vendor: { name: 'OfficeWorld' }, totalAmount: 45000, status: 'Completed', createdAt: '2024-03-27' },
  { id: 3, orderNo: 'PO-1040', vendor: { name: 'NetGear Distrib.' }, totalAmount: 32500, status: 'Draft', createdAt: '2024-03-26' },
  { id: 4, orderNo: 'PO-1039', vendor: { name: 'PrintMaster' }, totalAmount: 8200, status: 'Acknowledged', createdAt: '2024-03-25' },
];

const demoRecentRequests = [
  { id: 1, requestNo: 'PR-001', user: { name: 'Ravi Kumar', department: 'Operations' }, status: 'Pending', priority: 'High', createdAt: '2024-03-28' },
  { id: 2, requestNo: 'PR-002', user: { name: 'Admin User', department: 'IT' }, status: 'Pending', priority: 'Urgent', createdAt: '2024-03-27' },
];

const statusStyles = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Sent: 'bg-blue-100 text-blue-700',
  Draft: 'bg-slate-100 text-slate-700',
  Acknowledged: 'bg-indigo-100 text-indigo-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const priorityStyles = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-600',
  High: 'bg-amber-100 text-amber-700',
  Urgent: 'bg-red-100 text-red-700',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    inventoryApi.getStats()
      .then(res => { if (res?.data) setStats(res.data); })
      .catch(() => { /* Use demo data */ });
  }, []);

  const statCards = [
    {
      label: 'Total Inventory',
      value: stats?.totalInventoryQty ?? 356,
      change: `${stats?.totalProducts ?? 15} products`,
      trend: 'up',
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      ring: 'ring-blue-200',
    },
    {
      label: 'Pending Requests',
      value: stats?.pendingRequests ?? 3,
      change: 'Awaiting approval',
      trend: 'up',
      icon: ShoppingCart,
      color: 'bg-amber-50 text-amber-600',
      ring: 'ring-amber-200',
    },
    {
      label: 'Active Vendors',
      value: stats?.activeVendors ?? 5,
      change: 'All verified',
      trend: 'up',
      icon: Truck,
      color: 'bg-emerald-50 text-emerald-600',
      ring: 'ring-emerald-200',
    },
    {
      label: 'Low Stock Alerts',
      value: stats?.lowStockCount ?? 4,
      change: 'Need reorder',
      trend: 'down',
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      ring: 'ring-red-200',
    },
  ];

  const recentOrders = stats?.recentOrders ?? demoRecentOrders;
  const recentRequests = stats?.recentRequests ?? demoRecentRequests;

  const formatINR = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      {/* Welcome */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h2>
          <p className="text-slate-500 text-sm mt-1">Here's your procurement pipeline overview.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, change, trend, icon: Icon, color, ring }, i) => (
          <motion.div
            key={label}
            whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(0,0,0,0.08)' }}
            className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-shadow ring-1 ${ring} ring-opacity-0 hover:ring-opacity-100`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              {trend === 'up'
                ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                : <TrendingDown className="w-4 h-4 text-red-500" />
              }
            </div>
            <p className="text-3xl font-display font-bold text-slate-800">{value}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
            <p className={`text-xs mt-2 font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>{change}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Inventory Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-display font-bold text-slate-800 mb-4">Inventory Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorInventory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)',
                  fontSize: '13px',
                }}
              />
              <Area type="monotone" dataKey="inventory" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorInventory)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Purchase Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-display font-bold text-slate-800 mb-4">Weekly Purchase Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="purchases" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
              <Bar dataKey="receipts" fill="#34d399" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Tables row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-display font-bold text-slate-800">Recent Purchase Orders</h3>
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((o) => (
                  <tr key={o.id || o.orderNo} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5 font-medium text-blue-600">{o.orderNo}</td>
                    <td className="px-6 py-3.5 text-slate-700">{o.vendor?.name}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">{formatINR(o.totalAmount)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[o.status] || 'bg-slate-100'}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-display font-bold text-slate-800">Pending Approvals</h3>
            <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center justify-center">
              {recentRequests.filter(r => r.status === 'Pending').length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {recentRequests.filter(r => r.status === 'Pending').map((a) => (
              <div key={a.id || a.requestNo} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {a.user?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.user?.name}</p>
                    <p className="text-xs text-slate-400">{a.user?.department}</p>
                  </div>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${priorityStyles[a.priority] || ''}`}>
                    {a.priority}
                  </span>
                </div>
                <div className="flex gap-2 pl-11 mt-2">
                  <button onClick={async () => { try { await purchaseRequestsApi.approve(a.id); const res = await inventoryApi.getStats(); if (res?.data) setStats(res.data); } catch {} }} className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition">
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <a href="/purchase-requests" className="flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition">
                    <Clock className="w-3 h-3" /> Review
                  </a>
                </div>
              </div>
            ))}
            {recentRequests.filter(r => r.status === 'Pending').length === 0 && (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No pending approvals 🎉
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
