import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { purchaseOrdersApi, purchaseRequestsApi, vendorsApi, productsApi } from '../../api/index.js';

export default function PurchaseOrderPage() {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ requestId: '', vendorId: '', expectedDelivery: '', items: [] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    purchaseOrdersApi.getAll().then(r => r?.data && setOrders(r.data)).catch(() => {});
    purchaseRequestsApi.getAll({ status: 'Approved' }).then(r => {
      if (r?.data) setApprovedRequests(r.data.filter(req => req.status === 'Approved'));
    }).catch(() => {});
    vendorsApi.getAll().then(r => r?.data && setVendors(r.data.filter(v => v.status === 'Active'))).catch(() => {});
    productsApi.getAll().then(r => r?.data && setProducts(r.data)).catch(() => {});
  };

  const statusStyle = { Draft: 'bg-slate-100 text-slate-700', Sent: 'bg-blue-100 text-blue-700', Acknowledged: 'bg-indigo-100 text-indigo-700', Completed: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-red-100 text-red-700' };

  const handleSelectRequest = (requestId) => {
    const req = approvedRequests.find(r => r.id === parseInt(requestId));
    const newItems = req ? req.items.map(i => ({
      productId: i.productId,
      productName: i.product?.name || '',
      quantityOrdered: i.quantity,
      priceEach: i.product?.price || 0,
    })) : [];
    setForm({ ...form, requestId, items: newItems });
  };

  const updateFormItem = (i, field, val) => {
    const updated = [...form.items];
    updated[i][field] = parseFloat(val) || 0;
    setForm({ ...form, items: updated });
  };

  const handleCreate = async () => {
    if (!form.requestId || !form.vendorId || form.items.length === 0) return;
    try {
      await purchaseOrdersApi.create({
        requestId: parseInt(form.requestId),
        vendorId: parseInt(form.vendorId),
        expectedDelivery: form.expectedDelivery || undefined,
        items: form.items.map(i => ({ productId: i.productId, quantityOrdered: i.quantityOrdered, priceEach: i.priceEach })),
      });
      setShowForm(false);
      setForm({ requestId: '', vendorId: '', expectedDelivery: '', items: [] });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const totalAmount = form.items.reduce((s, i) => s + i.quantityOrdered * i.priceEach, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-800">Purchase Orders</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create PO
        </button>
      </div>

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
                <td className="px-6 py-3.5 font-medium text-blue-600">{po.orderNo}</td>
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

      {/* Create PO Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Create Purchase Order</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Approved Request *</label>
                  <select value={form.requestId} onChange={e => handleSelectRequest(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select approved request...</option>
                    {approvedRequests.map(r => <option key={r.id} value={r.id}>{r.requestNo} — {r.user?.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Vendor *</label>
                    <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select vendor...</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Expected Delivery</label>
                    <input type="date" value={form.expectedDelivery} onChange={e => setForm({ ...form, expectedDelivery: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {form.items.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Order Items</label>
                    {form.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2 text-sm">
                        <span className="flex-1 text-slate-700">{item.productName}</span>
                        <input type="number" value={item.quantityOrdered} onChange={e => updateFormItem(i, 'quantityOrdered', e.target.value)} min="1"
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-center text-sm" />
                        <span className="text-slate-400">×</span>
                        <input type="number" value={item.priceEach} onChange={e => updateFormItem(i, 'priceEach', e.target.value)}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" />
                      </div>
                    ))}
                    <div className="text-right font-bold text-slate-800 mt-2 pt-2 border-t border-slate-100">
                      Total: ₹{totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} disabled={!form.requestId || !form.vendorId}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Create Order</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
