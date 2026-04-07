import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, Edit2, Trash2, X, Tag } from 'lucide-react';
import { productsApi } from '../../api/index.js';
import useAuthStore from '../../store/auth.store';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', description: '', unit: 'pcs', price: '', categoryId: '' });
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll();
      if (res?.data) setProducts(res.data);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(products.map(p => p.category?.name).filter(Boolean))];

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', description: '', unit: 'pcs', price: '', categoryId: '' });
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      unit: product.unit,
      price: product.price,
      categoryId: product.categoryId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const data = { ...form, price: parseFloat(form.price) || 0, categoryId: form.categoryId ? parseInt(form.categoryId) : null };
      if (editProduct) {
        await productsApi.update(editProduct.id, data);
      } else {
        await productsApi.create(data);
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.remove(id);
      fetchProducts();
    } catch (err) { console.error(err); }
  };

  const formatINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Products</h2>
          <p className="text-slate-500 text-sm mt-1">{products.length} products in catalog</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
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
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Price</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Unit</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                {isAdmin && <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">No products found</td></tr>
              ) : filtered.map(p => {
                const stock = p.inventory?.quantity ?? '-';
                const stockColor = p.inventory && p.inventory.quantity <= (p.inventory.reorderPoint || 10)
                  ? 'text-red-600 font-bold' : 'text-slate-800 font-medium';
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-800">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="px-6 py-3.5">
                      {p.category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          <Tag className="w-3 h-3" /> {p.category.name}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-800">{formatINR(p.price)}</td>
                    <td className="px-6 py-3.5 text-center text-slate-500">{p.unit}</td>
                    <td className={`px-6 py-3.5 text-center ${stockColor}`}>{stock}</td>
                    {isAdmin && (
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-700" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">{editProduct ? 'Edit Product' : 'Add Product'}</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Product Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">SKU *</label>
                  <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editProduct} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Price (₹) *</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {['pcs', 'kg', 'liters', 'box', 'roll', 'set'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleSubmit} disabled={!form.name || !form.sku || !form.price}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {editProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
