import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Plus, X, Calendar, RefreshCw } from 'lucide-react';
import { warrantiesApi, subscriptionsApi, productsApi } from '../../api/index.js';

export default function WarrantiesPage() {
  const [tab, setTab] = useState('warranties');
  const [warranties, setWarranties] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [warrantyForm, setWarrantyForm] = useState({ productId: '', serialNo: '', provider: '', startDate: '', endDate: '', terms: '' });
  const [subForm, setSubForm] = useState({ name: '', vendor: '', type: 'Software', startDate: '', endDate: '', renewalCost: '', licenseCount: '1', autoRenew: false, notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    warrantiesApi.getAll().then(r => r?.data && setWarranties(r.data)).catch(() => {});
    subscriptionsApi.getAll().then(r => r?.data && setSubscriptions(r.data)).catch(() => {});
    productsApi.getAll().then(r => r?.data && setProducts(r.data)).catch(() => {});
  };

  const getDaysLeft = (endDate) => Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  const getExpiryStyle = (days) => {
    if (days <= 0) return 'bg-red-100 text-red-700 border-red-200';
    if (days <= 30) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const handleCreateWarranty = async () => {
    if (!warrantyForm.productId || !warrantyForm.startDate || !warrantyForm.endDate) return;
    try {
      await warrantiesApi.create({ ...warrantyForm, productId: parseInt(warrantyForm.productId) });
      setShowForm(false);
      setWarrantyForm({ productId: '', serialNo: '', provider: '', startDate: '', endDate: '', terms: '' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreateSubscription = async () => {
    if (!subForm.name || !subForm.startDate || !subForm.endDate) return;
    try {
      await subscriptionsApi.create({
        ...subForm,
        renewalCost: parseFloat(subForm.renewalCost) || 0,
        licenseCount: parseInt(subForm.licenseCount) || 1,
      });
      setShowForm(false);
      setSubForm({ name: '', vendor: '', type: 'Software', startDate: '', endDate: '', renewalCost: '', licenseCount: '1', autoRenew: false, notes: '' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">Warranties & Subscriptions</h2>
          <p className="text-sm text-slate-500 mt-1">Track asset warranties and software licenses</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add {tab === 'warranties' ? 'Warranty' : 'Subscription'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('warranties')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'warranties' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Award className="w-4 h-4 inline mr-1.5" />Warranties ({warranties.length})
        </button>
        <button onClick={() => setTab('subscriptions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'subscriptions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <RefreshCw className="w-4 h-4 inline mr-1.5" />Subscriptions ({subscriptions.length})
        </button>
      </div>

      {/* Warranties Tab */}
      {tab === 'warranties' && (
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
                  {w.terms && <p className="text-xs text-slate-500 italic">{w.terms}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-current/10">
                  <span className="text-sm font-semibold">
                    {daysLeft <= 0 ? '🔴 Expired' : daysLeft <= 30 ? `⚠️ ${daysLeft} days left` : `✅ ${daysLeft} days left`}
                  </span>
                </div>
              </motion.div>
            );
          })}
          {warranties.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center text-slate-400">
              No warranties recorded yet
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {tab === 'subscriptions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subscriptions.map(s => {
            const daysLeft = getDaysLeft(s.endDate);
            return (
              <motion.div key={s.id} whileHover={{ y: -2 }} className={`rounded-2xl border p-5 shadow-sm ${getExpiryStyle(daysLeft)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{s.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 text-slate-600 mt-1 inline-block">{s.type}</span>
                  </div>
                  <RefreshCw className={`w-5 h-5 flex-shrink-0 ${s.autoRenew ? 'text-emerald-600' : ''}`} />
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {s.vendor && <p><span className="text-slate-500">Vendor:</span> {s.vendor}</p>}
                  <p><span className="text-slate-500">Licenses:</span> {s.licenseCount}</p>
                  <p><span className="text-slate-500">Renewal:</span> ₹{Number(s.renewalCost).toLocaleString('en-IN')}</p>
                  <p><span className="text-slate-500">End:</span> {new Date(s.endDate).toLocaleDateString()}</p>
                  {s.autoRenew && <p className="text-xs text-emerald-600 font-medium">🔄 Auto-renewal enabled</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-current/10">
                  <span className="text-sm font-semibold">
                    {daysLeft <= 0 ? '🔴 Expired' : daysLeft <= 30 ? `⚠️ ${daysLeft} days left` : `✅ ${daysLeft} days left`}
                  </span>
                </div>
              </motion.div>
            );
          })}
          {subscriptions.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center text-slate-400">
              No subscriptions recorded yet
            </div>
          )}
        </div>
      )}

      {/* Add Warranty/Subscription Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Add {tab === 'warranties' ? 'Warranty' : 'Subscription'}</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              {tab === 'warranties' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Product *</label>
                    <select value={warrantyForm.productId} onChange={e => setWarrantyForm({ ...warrantyForm, productId: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Serial No</label>
                      <input value={warrantyForm.serialNo} onChange={e => setWarrantyForm({ ...warrantyForm, serialNo: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Provider</label>
                      <input value={warrantyForm.provider} onChange={e => setWarrantyForm({ ...warrantyForm, provider: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Start Date *</label>
                      <input type="date" value={warrantyForm.startDate} onChange={e => setWarrantyForm({ ...warrantyForm, startDate: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">End Date *</label>
                      <input type="date" value={warrantyForm.endDate} onChange={e => setWarrantyForm({ ...warrantyForm, endDate: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Terms/Notes</label>
                    <textarea value={warrantyForm.terms} onChange={e => setWarrantyForm({ ...warrantyForm, terms: e.target.value })} rows={2}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                    <button onClick={handleCreateWarranty} disabled={!warrantyForm.productId || !warrantyForm.startDate || !warrantyForm.endDate}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Add Warranty</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name *</label>
                    <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="Microsoft 365, GitHub Enterprise..."
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Vendor</label>
                      <input value={subForm.vendor} onChange={e => setSubForm({ ...subForm, vendor: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Type</label>
                      <select value={subForm.type} onChange={e => setSubForm({ ...subForm, type: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Software</option>
                        <option>SaaS</option>
                        <option>Service</option>
                        <option>Maintenance</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Start Date *</label>
                      <input type="date" value={subForm.startDate} onChange={e => setSubForm({ ...subForm, startDate: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">End Date *</label>
                      <input type="date" value={subForm.endDate} onChange={e => setSubForm({ ...subForm, endDate: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Renewal Cost (₹)</label>
                      <input type="number" value={subForm.renewalCost} onChange={e => setSubForm({ ...subForm, renewalCost: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Licenses</label>
                      <input type="number" value={subForm.licenseCount} onChange={e => setSubForm({ ...subForm, licenseCount: e.target.value })} min="1"
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">Auto-Renew</label>
                    <button onClick={() => setSubForm({ ...subForm, autoRenew: !subForm.autoRenew })}
                      className={`relative w-11 h-6 rounded-full transition ${subForm.autoRenew ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${subForm.autoRenew ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Notes</label>
                    <textarea value={subForm.notes} onChange={e => setSubForm({ ...subForm, notes: e.target.value })} rows={2}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                    <button onClick={handleCreateSubscription} disabled={!subForm.name || !subForm.startDate || !subForm.endDate}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Add Subscription</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
