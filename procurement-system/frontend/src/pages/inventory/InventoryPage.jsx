import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, AlertTriangle, Edit2, X, Filter } from 'lucide-react';
import { inventoryApi } from '../../api/index.js';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await inventoryApi.getAll();
      if (res?.data) setInventory(res.data);
    } catch { setInventory([]); }
    finally { setLoading(false); }
  };

  const filtered = inventory.filter(item =>
    item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.product?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (item) => {
    if (item.quantity <= item.minimumStock) return { label: 'Critical', style: 'bg-red-100 text-red-700' };
    if (item.quantity <= item.reorderPoint) return { label: 'Low', style: 'bg-amber-100 text-amber-700' };
    return { label: 'In Stock', style: 'bg-emerald-100 text-emerald-700' };
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    try {
      await inventoryApi.update(editItem.id, {
        quantity: editItem.quantity,
        reorderPoint: editItem.reorderPoint,
        minimumStock: editItem.minimumStock,
        location: editItem.location,
      });
      setEditItem(null);
      fetchInventory();
    } catch (err) { console.error(err); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500 text-sm mt-1">{inventory.length} items tracked</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Product</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Reorder Pt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Location</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400">No items found</td></tr>
              ) : filtered.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5 font-medium text-slate-800">{item.product?.name}</td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{item.product?.sku}</td>
                    <td className="px-6 py-3.5 text-slate-600">{item.product?.category?.name || '-'}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="px-6 py-3.5 text-center text-slate-500">{item.reorderPoint}</td>
                    <td className="px-6 py-3.5 text-slate-600">{item.location || '-'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.style}`}>{status.label}</span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button onClick={() => setEditItem({ ...item })} className="text-blue-600 hover:text-blue-700">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-800">Edit Inventory</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{editItem.product?.name}</p>
            <div className="space-y-3">
              {[
                { label: 'Quantity', key: 'quantity', type: 'number' },
                { label: 'Reorder Point', key: 'reorderPoint', type: 'number' },
                { label: 'Minimum Stock', key: 'minimumStock', type: 'number' },
                { label: 'Location', key: 'location', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700">{label}</label>
                  <input type={type} value={editItem[key] || ''} onChange={e => setEditItem({ ...editItem, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleUpdate} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Save Changes</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
