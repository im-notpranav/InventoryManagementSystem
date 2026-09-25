import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { goodsReceiptsApi, purchaseOrdersApi } from '../../api/index.js';

export default function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    goodsReceiptsApi.getAll().then(r => r?.data && setReceipts(r.data)).catch(() => {});
    purchaseOrdersApi.getAll().then(r => {
      if (r?.data) setOrders(r.data.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled'));
    }).catch(() => {});
  };

  const handleSelectOrder = (orderId) => {
    const order = orders.find(o => o.id === parseInt(orderId));
    setSelectedOrder(order);
    if (order) {
      setItems(order.items.map(i => ({
        productId: i.productId,
        productName: i.product?.name || '',
        quantityOrdered: i.quantityOrdered,
        quantityReceived: i.quantityOrdered - (i.quantityReceived || 0),
        condition: 'Good',
      })));
    } else {
      setItems([]);
    }
  };

  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i][field] = field === 'quantityReceived' ? parseInt(val) || 0 : val;
    setItems(updated);
  };

  const handleCreate = async () => {
    if (!selectedOrder || items.length === 0) return;
    try {
      await goodsReceiptsApi.create({
        orderId: selectedOrder.id,
        notes,
        items: items.filter(i => i.quantityReceived > 0).map(i => ({
          productId: i.productId,
          quantityReceived: i.quantityReceived,
          condition: i.condition,
        })),
      });
      setShowForm(false);
      setSelectedOrder(null);
      setItems([]);
      setNotes('');
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-800">Goods Receipts</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record Receipt
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Receipt #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Order</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Received By</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {receipts.map(gr => (
              <tr key={gr.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{gr.receiptNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{gr.order?.po_number || gr.order?.orderNo || `PO-${gr.orderId}`}</td>
                <td className="px-6 py-3.5 text-slate-600">{gr.order?.vendor?.name}</td>
                <td className="px-6 py-3.5 text-slate-600">{gr.receivedBy}</td>
                <td className="px-6 py-3.5 text-slate-500 text-xs">{gr.items?.length} items</td>
                <td className="px-6 py-3.5 text-slate-500">{new Date(gr.receivedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {receipts.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No goods receipts recorded yet</div>}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Record Goods Receipt</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Purchase Order *</label>
                  <select value={selectedOrder?.id || ''} onChange={e => handleSelectOrder(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select order...</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.po_number || o.orderNo} — {o.vendor?.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivery notes..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {items.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Items Received</label>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-xl text-sm">
                        <span className="flex-1 text-slate-700">{item.productName}</span>
                        <input type="number" value={item.quantityReceived} onChange={e => updateItem(i, 'quantityReceived', e.target.value)} min="0" max={item.quantityOrdered}
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-center text-sm" />
                        <select value={item.condition} onChange={e => updateItem(i, 'condition', e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
                          <option>Good</option>
                          <option>Damaged</option>
                          <option>Partial</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} disabled={!selectedOrder}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Record Receipt</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
