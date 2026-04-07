import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Plus, Search, Star, X, Mail, Phone, MapPin } from 'lucide-react';
import { vendorsApi } from '../../api/index.js';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gstNumber: '' });

  useEffect(() => { vendorsApi.getAll().then(r => r?.data && setVendors(r.data)).catch(() => {}); }, []);

  const filtered = vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    try {
      await vendorsApi.create(form);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', address: '', gstNumber: '' });
      const res = await vendorsApi.getAll();
      if (res?.data) setVendors(res.data);
    } catch (err) { console.error(err); }
  };

  const statusColor = { Active: 'bg-emerald-100 text-emerald-700', Inactive: 'bg-slate-100 text-slate-600', Blocked: 'bg-red-100 text-red-700' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Vendor Management</h2>
          <p className="text-slate-500 text-sm mt-1">{vendors.length} vendors registered</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(vendor => (
          <motion.div key={vendor.id} whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {vendor.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{vendor.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < Math.round(vendor.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">{vendor.rating}</span>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[vendor.status] || ''}`}>
                {vendor.status}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-slate-500">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {vendor.email}</div>
              {vendor.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {vendor.phone}</div>}
              {vendor.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {vendor.address}</div>}
            </div>
            {vendor.gstNumber && <p className="text-xs text-slate-400 mt-2 font-mono">GST: {vendor.gstNumber}</p>}
          </motion.div>
        ))}
      </div>

      {/* Add Vendor Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-800">Add Vendor</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Company Name', key: 'name', required: true },
                { label: 'Email', key: 'email', type: 'email', required: true },
                { label: 'Phone', key: 'phone' },
                { label: 'Address', key: 'address' },
                { label: 'GST Number', key: 'gstNumber' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700">{label}{required && ' *'}</label>
                  <input type={type || 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={required}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Add Vendor</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
