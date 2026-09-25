// Functional placeholder pages with API integration stubs
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, FileText, Warehouse, Receipt, Award, Bell, Users, Settings, Plus, CheckCircle, X, Clock, Filter } from 'lucide-react';
import { purchaseRequestsApi, purchaseOrdersApi, goodsReceiptsApi, invoicesApi, warrantiesApi, notificationsApi, usersApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext';

// ─── Purchase Requests ─────────────────────────────
export function PurchaseRequestPage() {
  const [requests, setRequests] = useState([]);
  const { user } = useAuth();
  useEffect(() => { purchaseRequestsApi.getAll().then(r => r?.data && setRequests(r.data)).catch(() => {}); }, []);
  const statusStyle = { Pending: 'bg-amber-100 text-amber-700', Approved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700' };
  const priorityStyle = { Low: 'text-slate-500', Medium: 'text-blue-600', High: 'text-amber-600', Urgent: 'text-red-600' };

  const handleApprove = async (id) => {
    await purchaseRequestsApi.approve(id);
    const res = await purchaseRequestsApi.getAll();
    if (res?.data) setRequests(res.data);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Purchase Requests</h2>
          <p className="text-slate-500 text-sm mt-1">{requests.length} requests</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Request #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Requested By</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            {(user?.role === 'Admin' || user?.role === 'Manager') && <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {requests.map(pr => (
              <tr key={pr.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{pr.pr_number || pr.requestNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{pr.user?.name} <span className="text-xs text-slate-400">({pr.user?.department})</span></td>
                <td className="px-6 py-3.5 text-slate-600">{pr.items?.map(i => `${i.product?.name} ×${i.quantity}`).join(', ')}</td>
                <td className={`px-6 py-3.5 font-semibold text-sm ${priorityStyle[pr.priority] || ''}`}>{pr.priority}</td>
                <td className="px-6 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[pr.status] || ''}`}>{pr.status}</span></td>
                {(user?.role === 'Admin' || user?.role === 'Manager') && (
                  <td className="px-6 py-3.5 text-center">
                    {pr.status === 'Pending' && (
                      <button onClick={() => handleApprove(pr.id)} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-semibold">
                        <CheckCircle className="w-3 h-3 inline mr-1" />Approve
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No purchase requests yet</div>}
      </div>
    </motion.div>
  );
}

// ─── Purchase Orders ────────────────────────────────
export function PurchaseOrderPage() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { purchaseOrdersApi.getAll().then(r => r?.data && setOrders(r.data)).catch(() => {}); }, []);
  const statusStyle = { Draft: 'bg-slate-100 text-slate-700', Sent: 'bg-blue-100 text-blue-700', Acknowledged: 'bg-indigo-100 text-indigo-700', Completed: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-red-100 text-red-700' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-slate-800">Purchase Orders</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Order #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map(po => (
              <tr key={po.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{po.po_number || po.orderNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{po.vendor?.name}</td>
                <td className="px-6 py-3.5 text-slate-600 text-xs">{po.items?.map(i => `${i.product?.name} ×${i.quantityOrdered}`).join(', ')}</td>
                <td className="px-6 py-3.5 text-right font-medium">₹{Number(po.totalAmount).toLocaleString('en-IN')}</td>
                <td className="px-6 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[po.status] || ''}`}>{po.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No purchase orders yet</div>}
      </div>
    </motion.div>
  );
}

// ─── Goods Receipts ─────────────────────────────────
export function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState([]);
  useEffect(() => { goodsReceiptsApi.getAll().then(r => r?.data && setReceipts(r.data)).catch(() => {}); }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-slate-800">Goods Receipts</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Receipt #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Order</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Received By</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {receipts.map(gr => (
              <tr key={gr.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{gr.receiptNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{gr.order?.po_number || gr.order?.orderNo || `PO-${gr.orderId}`}</td>
                <td className="px-6 py-3.5 text-slate-600">{gr.order?.vendor?.name}</td>
                <td className="px-6 py-3.5 text-slate-600">{gr.receivedBy}</td>
                <td className="px-6 py-3.5 text-slate-500">{new Date(gr.receivedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {receipts.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No goods receipts recorded yet</div>}
      </div>
    </motion.div>
  );
}

// ─── Invoices ───────────────────────────────────────
export function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => { invoicesApi.getAll().then(r => r?.data && setInvoices(r.data)).catch(() => {}); }, []);
  const statusStyle = { Pending: 'bg-amber-100 text-amber-700', Paid: 'bg-emerald-100 text-emerald-700', Overdue: 'bg-red-100 text-red-700' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-slate-800">Invoices</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{inv.invoiceNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{inv.order?.vendor?.name}</td>
                <td className="px-6 py-3.5 text-right text-slate-600">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                <td className="px-6 py-3.5 text-right font-medium text-slate-800">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</td>
                <td className="px-6 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[inv.status] || ''}`}>{inv.status}</span></td>
                <td className="px-6 py-3.5 text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No invoices recorded yet</div>}
      </div>
    </motion.div>
  );
}

// ─── Warranties ─────────────────────────────────────
export function WarrantiesPage() {
  const [warranties, setWarranties] = useState([]);
  useEffect(() => { warrantiesApi.getAll().then(r => r?.data && setWarranties(r.data)).catch(() => {}); }, []);

  const getDaysLeft = (endDate) => Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  const getExpiryStyle = (days) => {
    if (days <= 0) return 'bg-red-100 text-red-700 border-red-200';
    if (days <= 30) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-slate-800">Warranties & Subscriptions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {warranties.map(w => {
          const daysLeft = getDaysLeft(w.endDate);
          return (
            <motion.div key={w.id} whileHover={{ y: -2 }} className={`rounded-2xl border p-5 shadow-sm ${getExpiryStyle(daysLeft)}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{w.product?.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{w.serialNo && `S/N: ${w.serialNo}`}</p>
                </div>
                <Award className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {w.provider && <p><span className="text-slate-500">Provider:</span> {w.provider}</p>}
                <p><span className="text-slate-500">Start:</span> {new Date(w.startDate).toLocaleDateString()}</p>
                <p><span className="text-slate-500">End:</span> {new Date(w.endDate).toLocaleDateString()}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-current/10">
                <span className="text-sm font-semibold">
                  {daysLeft <= 0 ? '🔴 Expired' : daysLeft <= 30 ? `⚠️ ${daysLeft} days left` : `✅ ${daysLeft} days left`}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      {warranties.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center text-slate-400">
          No warranties recorded yet
        </div>
      )}
    </motion.div>
  );
}

// ─── Notifications ──────────────────────────────────
export function NotificationsPage() {
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  useEffect(() => { notificationsApi.getAll().then(r => r?.data && setData(r.data)).catch(() => {}); }, []);

  const handleMarkRead = async (id) => {
    await notificationsApi.markRead(id);
    const res = await notificationsApi.getAll();
    if (res?.data) setData(res.data);
  };

  const typeIcon = { info: '💬', warning: '⚠️', success: '✅', error: '❌' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Notifications</h2>
          <p className="text-slate-500 text-sm mt-1">{data.unreadCount} unread</p>
        </div>
        <button onClick={() => notificationsApi.markAllRead().then(() => notificationsApi.getAll().then(r => r?.data && setData(r.data)))}
          className="text-sm text-blue-600 font-medium hover:text-blue-700">Mark all read</button>
      </div>
      <div className="space-y-2">
        {data.notifications.map(n => (
          <motion.div key={n.id} whileHover={{ x: 2 }}
            className={`bg-white rounded-xl border p-4 flex items-start gap-3 cursor-pointer transition ${n.isRead ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'}`}
            onClick={() => !n.isRead && handleMarkRead(n.id)}
          >
            <span className="text-lg">{typeIcon[n.type] || '📌'}</span>
            <div className="flex-1">
              <h4 className={`text-sm font-semibold ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</h4>
              <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
          </motion.div>
        ))}
        {data.notifications.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center text-slate-400">
            No notifications yet 🔔
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chatbot Page ───────────────────────────────────
export function ChatbotPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🤖</span>
        </div>
        <h3 className="font-display font-bold text-slate-700 text-lg">AI Chatbot</h3>
        <p className="text-slate-400 text-sm mt-1">Use the floating chatbot widget in the bottom-right corner!</p>
      </div>
    </motion.div>
  );
}

// ─── Users & Roles ──────────────────────────────────
export function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => { usersApi.getAll().then(r => r?.data && setUsers(r.data)).catch(() => {}); }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-slate-800">Users & Roles</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-slate-800">{u.name}</td>
                <td className="px-6 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-6 py-3.5 text-slate-600">{u.department || '-'}</td>
                <td className="px-6 py-3.5">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{u.role}</span>
                </td>
                <td className="px-6 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No users found</div>}
      </div>
    </motion.div>
  );
}

// ─── Settings ───────────────────────────────────────
export function SettingsPage() {
  const { user } = useAuth();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-display font-bold text-slate-800">Settings</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Profile Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input defaultValue={user?.name} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" readOnly />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input defaultValue={user?.email} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" readOnly />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <input defaultValue={user?.role} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" readOnly />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Department</label>
              <input defaultValue={user?.department || '-'} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50" readOnly />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-2">System Information</h3>
          <p className="text-sm text-slate-500">InventBot v1.0.0 — Intelligent Inventory Management System</p>
          <p className="text-sm text-slate-400 mt-1">Powered by Gemini AI • React • Node.js • PostgreSQL</p>
        </div>
      </div>
    </motion.div>
  );
}
