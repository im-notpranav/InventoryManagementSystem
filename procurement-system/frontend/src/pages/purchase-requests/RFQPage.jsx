import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, X, Send, Check, Clock, Award, AlertCircle, Users, UserPlus } from 'lucide-react';
import { rfqApi, purchaseRequestsApi, vendorsApi } from '../../api/index.js';

export default function RFQPage() {
  const [rfqs, setRFQs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddVendorsModal, setShowAddVendorsModal] = useState(null); // rfq object
  const [showQuoteModal, setShowQuoteModal] = useState(null); // rfq object
  const [showCompareModal, setShowCompareModal] = useState(null); // rfq object
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ requestId: '', vendorIds: [], deadline: '', notes: '' });
  const [addVendorIds, setAddVendorIds] = useState([]);
  const [quoteForm, setQuoteForm] = useState({ vendorId: '', deliveryDays: '', validUntil: '', terms: '', notes: '', items: [] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    rfqApi.getAll().then(r => r?.data && setRFQs(r.data)).catch(() => {});
    purchaseRequestsApi.getAll({ status: 'Approved' }).then(r => {
      if (r?.data) setApprovedRequests(r.data.filter(req => req.status === 'Approved'));
    }).catch(() => {});
    vendorsApi.getAll().then(r => r?.data && setVendors(r.data.filter(v => v.status === 'Active'))).catch(() => {});
  };

  const statusStyle = {
    Open: 'bg-blue-100 text-blue-700',
    Closed: 'bg-slate-100 text-slate-600',
    Cancelled: 'bg-red-100 text-red-700',
  };

  const handleCreateRFQ = async () => {
    if (!form.requestId || form.vendorIds.length === 0) return;
    try {
      await rfqApi.create({
        requestId: parseInt(form.requestId),
        vendorIds: form.vendorIds.map(id => parseInt(id)),
        deadline: form.deadline || undefined,
        notes: form.notes,
      });
      setShowCreateModal(false);
      setForm({ requestId: '', vendorIds: [], deadline: '', notes: '' });
      fetchData();
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Failed to create RFQ'); }
  };

  const handleAddVendors = async () => {
    if (!showAddVendorsModal || addVendorIds.length === 0) return;
    try {
      await rfqApi.addVendors(showAddVendorsModal.id, addVendorIds.map(id => parseInt(id)));
      setShowAddVendorsModal(null);
      setAddVendorIds([]);
      fetchData();
    } catch (err) { console.error(err); alert(err.response?.data?.message || 'Failed to add vendors'); }
  };

  const openAddVendorsModal = (rfq) => {
    setShowAddVendorsModal(rfq);
    // Pre-select vendors not already invited
    const invitedIds = (rfq.vendors || []).map(v => v.vendor?.id || v.vendorId);
    setAddVendorIds([]);
  };

  const handleSelectRequest = (requestId) => {
    const req = approvedRequests.find(r => r.id === parseInt(requestId));
    setForm({ ...form, requestId });
    if (req && showQuoteModal) {
      // Pre-fill quote items from request
      setQuoteForm({
        ...quoteForm,
        items: req.items.map(i => ({
          productId: i.productId,
          productName: i.product?.name || i.customProductName,
          customProductName: i.customProductName,
          quantity: i.quantity,
          unitPrice: '',
        })),
      });
    }
  };

  const openQuoteModal = (rfq) => {
    setShowQuoteModal(rfq);
    setQuoteForm({
      vendorId: '',
      deliveryDays: '',
      validUntil: '',
      terms: '',
      notes: '',
      items: rfq.request.items.map(i => ({
        productId: i.productId,
        productName: i.product?.name || i.customProductName,
        customProductName: i.customProductName,
        quantity: i.quantity,
        unitPrice: '',
      })),
    });
  };

  const handleSubmitQuotation = async () => {
    if (!quoteForm.vendorId || quoteForm.items.some(i => !i.unitPrice)) return;
    try {
      await rfqApi.submitQuotation({
        rfqId: showQuoteModal.id,
        vendorId: parseInt(quoteForm.vendorId),
        deliveryDays: parseInt(quoteForm.deliveryDays) || null,
        validUntil: quoteForm.validUntil || undefined,
        terms: quoteForm.terms,
        notes: quoteForm.notes,
        items: quoteForm.items.map(i => ({
          productId: i.productId,
          customProductName: i.customProductName,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unitPrice),
        })),
      });
      setShowQuoteModal(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleSelectQuotation = async (quotationId) => {
    try {
      await rfqApi.selectQuotation(quotationId, {});
      setShowCompareModal(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const quoteTotal = quoteForm.items.reduce((sum, i) => sum + (parseFloat(i.unitPrice) || 0) * i.quantity, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Request for Quotations
          </h2>
          <p className="text-slate-500 text-sm mt-1">Collect vendor quotes before creating purchase orders</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Send RFQ
        </button>
      </div>

      {/* RFQ List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50/80">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">RFQ #</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Request</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendors</th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Quotes</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Deadline</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {rfqs.map(rfq => (
              <tr key={rfq.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-blue-600">{rfq.rfqNo}</td>
                <td className="px-6 py-3.5 text-slate-700">{rfq.request?.requestNo}</td>
                <td className="px-6 py-3.5 text-slate-600 text-xs max-w-[200px] truncate">
                  {rfq.request?.items?.map(i => i.product?.name || i.customProductName).join(', ')}
                </td>
                <td className="px-6 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      <Users className="w-3 h-3 inline mr-1" />{rfq.vendors?.length || 0}
                    </span>
                    {rfq.status === 'Open' && (
                      <button onClick={() => openAddVendorsModal(rfq)} 
                        className="text-blue-600 hover:text-blue-800" title="Add more vendors">
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    rfq.quotations?.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {rfq.quotations?.length || 0}/{rfq.vendors?.length || 0}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-500 text-xs">
                  {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle[rfq.status] || ''}`}>
                    {rfq.status}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-center">
                  {rfq.status === 'Open' && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button onClick={() => openQuoteModal(rfq)} 
                        className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-semibold">
                        <Send className="w-3 h-3 inline mr-1" />Add Quote
                      </button>
                      {rfq.quotations?.length > 0 && (
                        <button onClick={() => setShowCompareModal(rfq)} 
                          className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-semibold">
                          <Award className="w-3 h-3 inline mr-1" />Compare
                        </button>
                      )}
                    </div>
                  )}
                  {rfq.status === 'Closed' && (
                    <span className="text-xs text-slate-400">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rfqs.length === 0 && <div className="px-6 py-12 text-center text-slate-400">No RFQs yet. Create one from an approved request.</div>}
      </div>

      {/* Create RFQ Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Send Request for Quotation</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Approved Request *</label>
                  <select value={form.requestId} onChange={e => setForm({ ...form, requestId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select request...</option>
                    {approvedRequests.map(r => <option key={r.id} value={r.id}>{r.requestNo} — {r.user?.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Send to Vendors *</label>
                  <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2">
                    {vendors.map(v => (
                      <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={form.vendorIds.includes(v.id.toString())}
                          onChange={e => {
                            const id = v.id.toString();
                            setForm({
                              ...form,
                              vendorIds: e.target.checked 
                                ? [...form.vendorIds, id] 
                                : form.vendorIds.filter(i => i !== id)
                            });
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-slate-700">{v.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">⭐ {v.rating || 0}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Response Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any special requirements..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateRFQ} disabled={!form.requestId || form.vendorIds.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send RFQ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Quote Modal (for testing / manual entry) */}
      <AnimatePresence>
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Submit Quotation</h3>
                <button onClick={() => setShowQuoteModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">RFQ: {showQuoteModal.rfqNo}</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Vendor *</label>
                  <select value={quoteForm.vendorId} onChange={e => setQuoteForm({ ...quoteForm, vendorId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Delivery Days</label>
                    <input type="number" value={quoteForm.deliveryDays} onChange={e => setQuoteForm({ ...quoteForm, deliveryDays: e.target.value })}
                      placeholder="e.g., 7"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Valid Until</label>
                    <input type="date" value={quoteForm.validUntil} onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Item Pricing *</label>
                  {quoteForm.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2 text-sm">
                      <span className="flex-1 text-slate-700">{item.productName} × {item.quantity}</span>
                      <span className="text-slate-400">₹</span>
                      <input type="number" value={item.unitPrice} 
                        onChange={e => {
                          const updated = [...quoteForm.items];
                          updated[i].unitPrice = e.target.value;
                          setQuoteForm({ ...quoteForm, items: updated });
                        }}
                        placeholder="Unit price"
                        className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-right" />
                    </div>
                  ))}
                  <div className="text-right font-bold text-slate-800 mt-2 pt-2 border-t border-slate-100">
                    Total: ₹{quoteTotal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Terms & Conditions</label>
                  <textarea value={quoteForm.terms} onChange={e => setQuoteForm({ ...quoteForm, terms: e.target.value })}
                    placeholder="Payment terms, warranty, etc."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowQuoteModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleSubmitQuotation} disabled={!quoteForm.vendorId || quoteForm.items.some(i => !i.unitPrice)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                  Submit Quote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare Quotations Modal */}
      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Compare Quotations</h3>
                <button onClick={() => setShowCompareModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">RFQ: {showCompareModal.rfqNo} — Select the best quotation to create a Purchase Order</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {showCompareModal.quotations?.sort((a, b) => a.totalAmount - b.totalAmount).map((q, idx) => (
                  <div key={q.id} className={`border rounded-2xl p-4 ${idx === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                    {idx === 0 && (
                      <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold mb-2">
                        <Award className="w-4 h-4" /> Lowest Price
                      </div>
                    )}
                    <h4 className="font-semibold text-slate-800">{q.vendor?.name}</h4>
                    <div className="text-2xl font-bold text-blue-600 mt-2">₹{q.totalAmount.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Delivery: {q.deliveryDays ? `${q.deliveryDays} days` : 'Not specified'}
                      </div>
                      <div>⭐ Vendor Rating: {q.vendor?.rating || 0}/5</div>
                      {q.terms && <div className="text-slate-400 truncate" title={q.terms}>Terms: {q.terms}</div>}
                    </div>
                    <button 
                      onClick={() => handleSelectQuotation(q.id)}
                      className="w-full mt-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> Select & Create PO
                    </button>
                  </div>
                ))}
              </div>

              {showCompareModal.quotations?.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  No quotations received yet
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Vendors Modal */}
      <AnimatePresence>
        {showAddVendorsModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-800">Add More Vendors</h3>
                <button onClick={() => setShowAddVendorsModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">RFQ: {showAddVendorsModal.rfqNo}</p>
              
              {/* Already invited */}
              {showAddVendorsModal.vendors?.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 uppercase">Already Invited ({showAddVendorsModal.vendors.length})</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {showAddVendorsModal.vendors.map(v => (
                      <span key={v.vendor?.id || v.vendorId} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                        {v.vendor?.name}
                        <span className={`ml-1 ${v.status === 'Quoted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          ({v.status})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Select new vendors */}
              <div>
                <label className="text-sm font-medium text-slate-700">Add Vendors</label>
                <div className="mt-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
                  {vendors
                    .filter(v => !(showAddVendorsModal.vendors || []).some(iv => (iv.vendor?.id || iv.vendorId) === v.id))
                    .map(v => (
                    <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={addVendorIds.includes(v.id.toString())}
                        onChange={e => {
                          const id = v.id.toString();
                          setAddVendorIds(e.target.checked 
                            ? [...addVendorIds, id] 
                            : addVendorIds.filter(i => i !== id)
                          );
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">{v.name}</span>
                      <span className="text-xs text-slate-400 ml-auto">⭐ {v.rating || 0}</span>
                    </label>
                  ))}
                  {vendors.filter(v => !(showAddVendorsModal.vendors || []).some(iv => (iv.vendor?.id || iv.vendorId) === v.id)).length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">All vendors already invited</div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddVendorsModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleAddVendors} disabled={addVendorIds.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" /> Invite {addVendorIds.length} Vendor(s)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
