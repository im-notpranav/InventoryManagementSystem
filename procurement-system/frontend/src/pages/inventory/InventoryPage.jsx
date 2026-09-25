import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/inventory').then(res => setInventory(res.data?.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor stock levels across warehouses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map(item => {
          const isLow = item.quantity_available <= item.reorder_point;
          return (
            <motion.div key={`${item.product_id}-${item.warehouse_id}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border p-5 transition hover:shadow-md ${isLow ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isLow ? '#fef3c7' : '#dbeafe' }}>
                  {isLow ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <Package className="w-5 h-5 text-blue-500" />}
                </div>
                {isLow && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low Stock</span>}
              </div>
              <h3 className="font-semibold text-slate-800">{item.product?.name || 'Unknown'}</h3>
              <p className="text-xs text-slate-400 mb-3">{item.product?.sku} · {item.warehouse?.name}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-800">{item.quantity_available}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Available</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-amber-600">{item.reorder_point}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Reorder</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-600">{item.min_stock}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Min</p>
                </div>
              </div>
              {/* Stock bar */}
              <div className="mt-3">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (item.quantity_available / (item.max_stock || 100)) * 100)}%`,
                      background: isLow ? '#f59e0b' : '#3b82f6',
                    }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>{item.min_stock} min</span>
                  <span>{item.max_stock || '—'} max</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        {inventory.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">No inventory data available</div>
        )}
      </div>
    </div>
  );
}
