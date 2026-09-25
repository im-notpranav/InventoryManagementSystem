import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { invoicesApi, purchaseOrdersApi } from '../../api/index.js';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ invoiceNo: '', orderId: '', amount: '', taxAmount: '0', invoiceDate: '', dueDate: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    invoicesApi.getAll().then(r => r?.data && setInvoices(r.data)).catch(() => {});
    purchaseOrdersApi.getAll().then(r => r?.data && setOrders(r.data)).catch(() => {});
  };

  const statusStyle = { Pending: 'bg-amber-100 text-amber-700', Paid: 'bg-emerald-100 text-emerald-700', Overdue: 'bg-red-100 text-red-700' };

  const handleCreate = async () => {
    if (!form.invoiceNo || !form.orderId || !form.amount || !form.invoiceDate) return;
    try {
      await invoicesApi.create({
        invoiceNo: form.invoiceNo,
        orderId: parseInt(form.orderId),
        amount: parseFloat(form.amount),
        taxAmount: parseFloat(form.taxAmount) || 0,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || undefined,
      });
      setShowForm(false);
      setForm({ invoiceNo: '', orderId: '', amount: '', taxAmount: '0', invoiceDate: '', dueDate: '' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleSelectOrder = (orderId) => {
    const order = orders.find(o => o.id === parseInt(orderId));
    setForm({ ...form, orderId, amount: order?.totalAmount?.toString() || '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-800">Invoices</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Invoice
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Tax</th>
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
                <td className="px-6 py-3.5 text-right text-slate-500">₹{Number(inv.taxAmount).toLocaleString('en-IN')}</td>
                <td className="px-6 py-3.5 text-right font-medium text-slate-800">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</td>
                <td className="px-6 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[inv.status] || ''}`}>{inv.status}</span></td>
                <td className="px-6 py-3.5 text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No invoices recorded yet</div>}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Add Invoice</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Invoice Number *</label>
                  <input value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="INV-001" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Purchase Order *</label>
                  <select value={form.orderId} onChange={e => handleSelectOrder(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select order...</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.po_number || o.orderNo} — {o.vendor?.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Amount (₹) *</label>
                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Tax Amount (₹)</label>
                    <input type="number" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Invoice Date *</label>
                    <input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {form.amount && (
                  <div className="bg-slate-50 rounded-xl p-3 text-sm">
                    <span className="text-slate-500">Total:</span>{' '}
                    <span className="font-bold text-slate-800">₹{(parseFloat(form.amount || 0) + parseFloat(form.taxAmount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} disabled={!form.invoiceNo || !form.orderId || !form.amount || !form.invoiceDate}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Add Invoice</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
