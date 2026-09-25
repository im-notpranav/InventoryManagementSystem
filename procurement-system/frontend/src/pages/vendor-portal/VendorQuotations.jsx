import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, CheckCircle, XCircle, Clock, Package,
  Truck, Send, Eye, AlertTriangle, RefreshCw, DollarSign, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import WorkflowTracker from '../../components/WorkflowTracker';

const getPayload = (res, fallback) => {
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data !== undefined) return res.data;
  return fallback;
};

export default function VendorQuotations() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('quotations');
  const [submissions, setSubmissions] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [vendorId, setVendorId] = useState(null);
  const [submitForm, setSubmitForm] = useState({
    request_id: '', quoted_price: '', quoted_quantity: '', validity_days: '', notes: ''
  });
  const [dispatchForm, setDispatchForm] = useState({
    tax_invoice_number: '', expected_delivery: ''
  });
  const [files, setFiles] = useState({ quotation_file: null, proforma_file: null, tax_invoice: null });
  const [availablePRs, setAvailablePRs] = useState([]);

  useEffect(() => {
    // Fetch vendor profile to get vendorId
    const fetchProfile = async () => {
      try {
        const res = await api.get('/vendor-portal/profile');
        const profile = getPayload(res, null);
        if (profile?.vendor?.id) {
          setVendorId(profile.vendor.id);
        }
      } catch (err) { console.error('Failed to fetch vendor profile:', err); }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (vendorId) {
      fetchSubmissions();
      fetchWorkOrders();
      fetchAvailablePRs();
    }
  }, [vendorId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quotations/vendor/${vendorId}`);
      setSubmissions(getPayload(res, []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchWorkOrders = async () => {
    try {
      const res = await api.get(`/work-orders/vendor/${vendorId}`);
      setWorkOrders(getPayload(res, []));
    } catch (err) { console.error(err); }
  };

  const fetchAvailablePRs = async () => {
    try {
      const res = await api.get('/purchase-requests', { params: { status: 'Approved' } });
      setAvailablePRs(getPayload(res, []));
    } catch (err) { console.error(err); }
  };

  const handleSubmitQuotation = async () => {
    const fd = new FormData();
    fd.append('request_id', submitForm.request_id);
    fd.append('vendor_id', vendorId);
    fd.append('quoted_price', submitForm.quoted_price);
    fd.append('quoted_quantity', submitForm.quoted_quantity);
    if (submitForm.validity_days) fd.append('validity_days', submitForm.validity_days);
    if (submitForm.notes) fd.append('notes', submitForm.notes);
    if (files.quotation_file) fd.append('quotation_file', files.quotation_file);
    if (files.proforma_file) fd.append('proforma_file', files.proforma_file);

    try {
      await api.post('/quotations/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowSubmitModal(false);
      setSubmitForm({ request_id: '', quoted_price: '', quoted_quantity: '', validity_days: '', notes: '' });
      setFiles({ ...files, quotation_file: null, proforma_file: null });
      fetchSubmissions();
    } catch (err) { alert(err?.response?.data?.message || 'Failed to submit'); }
  };

  const handleAcknowledge = async (woId) => {
    try {
      await api.post(`/work-orders/${woId}/acknowledge`);
      fetchWorkOrders();
    } catch (err) { alert(err?.response?.data?.message || 'Failed to acknowledge'); }
  };

  const handleDispatch = async () => {
    if (!selectedWO) return;
    const fd = new FormData();
    fd.append('tax_invoice_number', dispatchForm.tax_invoice_number);
    if (dispatchForm.expected_delivery) fd.append('expected_delivery', dispatchForm.expected_delivery);
    if (files.tax_invoice) fd.append('tax_invoice', files.tax_invoice);

    try {
      await api.post(`/work-orders/${selectedWO.wo_id}/dispatch`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowDispatchModal(false);
      setDispatchForm({ tax_invoice_number: '', expected_delivery: '' });
      setFiles({ ...files, tax_invoice: null });
      fetchWorkOrders();
    } catch (err) { alert(err?.response?.data?.message || 'Failed to dispatch'); }
  };

  const getWOStep = (status) => {
    switch (status) {
      case 'draft': return 1;
      case 'issued': return 1;
      case 'acknowledged': return 2;
      case 'dispatched': return 2;
      default: return 0;
    }
  };

  const statusBadge = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      draft: 'bg-slate-100 text-slate-700',
      issued: 'bg-blue-100 text-blue-700',
      acknowledged: 'bg-indigo-100 text-indigo-700',
      dispatched: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const tabs = [
    { id: 'quotations', label: 'My Quotations', icon: FileText, count: submissions.length },
    { id: 'workorders', label: 'Work Orders', icon: Package, count: workOrders.length },
    { id: 'dispatch', label: 'Dispatch', icon: Truck, count: workOrders.filter(w => w.status === 'dispatched').length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-gradient-to-r from-brand-900 to-blue-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Vendor Quotation Portal</h1>
        <p className="text-blue-200 mt-1">Submit quotations, manage work orders, and track dispatches</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-blue-500' : 'bg-slate-200'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'quotations' && (
          <motion.div key="quot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">My Quotation Submissions</h2>
              <button onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Upload className="w-4 h-4" /> Submit Quotation
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : submissions.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600">No quotations submitted yet</h3>
                <p className="text-slate-500 mt-1">Click "Submit Quotation" to respond to a purchase request</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">PR Number</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Quoted Price</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Quantity</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Submitted</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Documents</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {submissions.map(s => (
                      <tr key={s.submission_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{s.request?.pr_number || s.request?.requestNo}</td>
                        <td className="px-4 py-3">₹{Number(s.quoted_price).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">{s.quoted_quantity}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(s.submitted_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{statusBadge(s.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {s.quotation_file_url && <a href={s.quotation_file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Quotation</a>}
                            {s.proforma_file_url && <a href={s.proforma_file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Proforma</a>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'workorders' && (
          <motion.div key="wo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Work Orders</h2>
            {workOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600">No work orders yet</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {workOrders.map(wo => (
                  <div key={wo.wo_id} className="bg-white rounded-2xl border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{wo.wo_number}</h3>
                        <p className="text-sm text-slate-500">PR: {wo.request?.pr_number || wo.request?.requestNo}</p>
                      </div>
                      {statusBadge(wo.status)}
                    </div>

                    <WorkflowTracker currentStep={getWOStep(wo.status)} compact />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-slate-500">Items</span><p className="font-medium">{wo.items_description}</p></div>
                      <div><span className="text-slate-500">Quantity</span><p className="font-medium">{wo.quantity}</p></div>
                      <div><span className="text-slate-500">Agreed Price</span><p className="font-medium">₹{Number(wo.agreed_price).toLocaleString('en-IN')}</p></div>
                      <div><span className="text-slate-500">Deadline</span><p className="font-medium">{new Date(wo.delivery_deadline).toLocaleDateString()}</p></div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      {wo.status === 'issued' && (
                        <button onClick={() => handleAcknowledge(wo.wo_id)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                          <CheckCircle className="w-4 h-4" /> Acknowledge
                        </button>
                      )}
                      {wo.status === 'acknowledged' && (
                        <button onClick={() => { setSelectedWO(wo); setShowDispatchModal(true); }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                          <Truck className="w-4 h-4" /> Mark as Dispatched
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'dispatch' && (
          <motion.div key="disp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Dispatched Orders</h2>
            {workOrders.filter(w => w.status === 'dispatched').length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <Truck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-600">No dispatched orders</h3>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">WO Number</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Dispatch Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Expected Delivery</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tax Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Gate Status</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {workOrders.filter(w => w.status === 'dispatched').map(wo => (
                      <tr key={wo.wo_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{wo.wo_number}</td>
                        <td className="px-4 py-3">{wo.dispatched_at ? new Date(wo.dispatched_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3">{wo.expected_delivery ? new Date(wo.expected_delivery).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3">{wo.tax_invoice_number || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {wo.gate_entry ? statusBadge(wo.gate_entry.status) : <span className="text-slate-400 text-xs">Awaiting arrival</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Quotation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSubmitModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Submit Quotation</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Request</label>
                  <select value={submitForm.request_id} onChange={e => setSubmitForm({...submitForm, request_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select a PR</option>
                    {availablePRs.map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.pr_number || pr.requestNo} — {pr.priority}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload Quotation PDF</label>
                  <input type="file" accept=".pdf" onChange={e => setFiles({...files, quotation_file: e.target.files[0]})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload Proforma Invoice PDF</label>
                  <input type="file" accept=".pdf" onChange={e => setFiles({...files, proforma_file: e.target.files[0]})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quoted Price (₹)</label>
                    <input type="number" value={submitForm.quoted_price} onChange={e => setSubmitForm({...submitForm, quoted_price: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input type="number" value={submitForm.quoted_quantity} onChange={e => setSubmitForm({...submitForm, quoted_quantity: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="1" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Validity (Days)</label>
                  <input type="number" value={submitForm.validity_days} onChange={e => setSubmitForm({...submitForm, validity_days: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea value={submitForm.notes} onChange={e => setSubmitForm({...submitForm, notes: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Additional notes..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSubmitQuotation}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    <Send className="w-4 h-4" /> Submit
                  </button>
                  <button onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2.5 text-slate-600 border rounded-lg hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dispatch Modal */}
      <AnimatePresence>
        {showDispatchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDispatchModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Mark as Dispatched</h3>
              <p className="text-sm text-slate-500 mb-4">WO: {selectedWO?.wo_number}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Invoice Number *</label>
                  <input type="text" value={dispatchForm.tax_invoice_number} onChange={e => setDispatchForm({...dispatchForm, tax_invoice_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="INV-2026-XXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                  <input type="date" value={dispatchForm.expected_delivery} onChange={e => setDispatchForm({...dispatchForm, expected_delivery: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload Tax Invoice PDF</label>
                  <input type="file" accept=".pdf" onChange={e => setFiles({...files, tax_invoice: e.target.files[0]})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleDispatch}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                    <Truck className="w-4 h-4" /> Confirm Dispatch
                  </button>
                  <button onClick={() => setShowDispatchModal(false)}
                    className="px-4 py-2.5 text-slate-600 border rounded-lg hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
