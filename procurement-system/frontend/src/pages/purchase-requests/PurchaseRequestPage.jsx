import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, CheckCircle, X, XCircle, Sparkles, Package } from 'lucide-react';
import { purchaseRequestsApi, productsApi } from '../../api/index.js';
import useAuthStore from '../../store/auth.store';

export default function PurchaseRequestPage() {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ isCustom: false, productId: '', quantity: 1, notes: '', customProductName: '', customProductDesc: '', customEstimatedPrice: '' }]);
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    purchaseRequestsApi.getAll().then(r => r?.data && setRequests(r.data)).catch(() => {});
    productsApi.getAll().then(r => r?.data && setProducts(r.data)).catch(() => {});
  };

  const statusStyle = { 
    Pending: 'bg-amber-100 text-amber-700', 
    Approved: 'bg-emerald-100 text-emerald-700', 
    Rejected: 'bg-red-100 text-red-700',
    RFQ_Sent: 'bg-blue-100 text-blue-700',
    PO_Created: 'bg-purple-100 text-purple-700',
  };
  const priorityStyle = { Low: 'text-slate-500', Medium: 'text-blue-600', High: 'text-amber-600', Urgent: 'text-red-600' };

  const handleApprove = async (id) => {
    await purchaseRequestsApi.approve(id);
    fetchData();
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await purchaseRequestsApi.reject(rejectId, rejectReason);
    setRejectId(null);
    setRejectReason('');
    fetchData();
  };

  const addItem = () => setItems([...items, { isCustom: false, productId: '', quantity: 1, notes: '', customProductName: '', customProductDesc: '', customEstimatedPrice: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    if (field === 'isCustom') {
      updated[i].isCustom = val;
      // Reset fields when switching mode
      if (val) {
        updated[i].productId = '';
      } else {
        updated[i].customProductName = '';
        updated[i].customProductDesc = '';
        updated[i].customEstimatedPrice = '';
      }
    } else if (field === 'quantity' || field === 'productId') {
      updated[i][field] = parseInt(val) || (field === 'quantity' ? 1 : '');
    } else if (field === 'customEstimatedPrice') {
      updated[i][field] = val === '' ? '' : parseFloat(val) || '';
    } else {
      updated[i][field] = val;
    }
    setItems(updated);
  };

  const handleCreate = async () => {
    const validItems = items.filter(i => 
      (i.isCustom && i.customProductName && i.quantity > 0) || 
      (!i.isCustom && i.productId && i.quantity > 0)
    ).map(i => ({
      productId: i.isCustom ? null : i.productId,
      quantity: i.quantity,
      notes: i.notes,
      customProductName: i.isCustom ? i.customProductName : null,
      customProductDesc: i.isCustom ? i.customProductDesc : null,
      customEstimatedPrice: i.isCustom && i.customEstimatedPrice ? i.customEstimatedPrice : null,
    }));
    
    if (validItems.length === 0) return;
    try {
      await purchaseRequestsApi.create({ items: validItems, priority, notes });
      setShowForm(false);
      setItems([{ isCustom: false, productId: '', quantity: 1, notes: '', customProductName: '', customProductDesc: '', customEstimatedPrice: '' }]);
      setPriority('Medium');
      setNotes('');
      fetchData();
    } catch (err) { console.error(err); }
  };

  // Helper to display item name in table
  const getItemDisplay = (item) => {
    if (item.product) {
      return `${item.product.name} ×${item.quantity}`;
    }
    if (item.customProductName) {
      return `🆕 ${item.customProductName} ×${item.quantity}`;
    }
    return `Unknown ×${item.quantity}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Purchase Requests</h2>
          <p className="text-slate-500 text-sm mt-1">{requests.length} requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Request #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Requested By</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            {isAdmin && <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {requests.map(pr => (
              <tr key={pr.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{pr.requestNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{pr.user?.name} <span className="text-xs text-slate-400">({pr.user?.department})</span></td>
                <td className="px-6 py-3.5 text-slate-600 text-xs">{pr.items?.map(i => getItemDisplay(i)).join(', ')}</td>
                <td className={`px-6 py-3.5 font-semibold text-sm ${priorityStyle[pr.priority] || ''}`}>{pr.priority}</td>
                <td className="px-6 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[pr.status] || ''}`}>{pr.status}</span></td>
                {isAdmin && (
                  <td className="px-6 py-3.5 text-center">
                    {pr.status === 'Pending' && (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleApprove(pr.id)} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-semibold">
                          <CheckCircle className="w-3 h-3 inline mr-1" />Approve
                        </button>
                        <button onClick={() => setRejectId(pr.id)} className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-semibold">
                          <XCircle className="w-3 h-3 inline mr-1" />Reject
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No purchase requests yet</div>}
      </div>

      {/* Create Request Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">New Purchase Request</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Notes</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..."
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Items</label>
                    <button onClick={addItem} className="text-xs text-blue-600 font-medium hover:text-blue-700">+ Add Item</button>
                  </div>
                  
                  {items.map((item, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 mb-3">
                      {/* Toggle between existing and custom product */}
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          onClick={() => updateItem(i, 'isCustom', false)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            !item.isCustom ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Package className="w-3 h-3" /> Existing Product
                        </button>
                        <button
                          onClick={() => updateItem(i, 'isCustom', true)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            item.isCustom ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" /> New Product
                        </button>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="ml-auto text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {!item.isCustom ? (
                        /* Existing Product Selection */
                        <div className="flex gap-2">
                          <select value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                          </select>
                          <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1"
                            placeholder="Qty"
                            className="w-20 px-3 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      ) : (
                        /* Custom Product Entry */
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={item.customProductName}
                              onChange={e => updateItem(i, 'customProductName', e.target.value)}
                              placeholder="Product name (e.g., Ergonomic Standing Desk)"
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1"
                              placeholder="Qty"
                              className="w-20 px-3 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500" />
                          </div>
                          <textarea
                            value={item.customProductDesc}
                            onChange={e => updateItem(i, 'customProductDesc', e.target.value)}
                            placeholder="Description: What exactly do you need? Include specs, size, color, brand preferences, etc."
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          />
                          <input
                            type="number"
                            value={item.customEstimatedPrice}
                            onChange={e => updateItem(i, 'customEstimatedPrice', e.target.value)}
                            placeholder="Estimated price per unit (₹) - optional"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      )}

                      {/* Item notes */}
                      <input
                        value={item.notes}
                        onChange={e => updateItem(i, 'notes', e.target.value)}
                        placeholder="Additional notes for this item (optional)"
                        className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Submit Request</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-display font-bold text-slate-800 mb-3">Reject Request</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection (optional)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleReject} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Reject</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
