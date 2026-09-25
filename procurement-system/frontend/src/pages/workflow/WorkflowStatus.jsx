import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Search, Filter, ChevronDown, ChevronUp,
  Clock, CheckCircle, FileText, Truck, Shield, DollarSign, RefreshCw, Package
} from 'lucide-react';
import api from '../../api/axios';
import WorkflowTracker from '../../components/WorkflowTracker';

const getPayload = (res, fallback) => {
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data !== undefined) return res.data;
  return fallback;
};

const STATUS_TO_STEP = {
  'Pending': 0, 'Approved': 0, 'rfq_sent': 0,
  'quotation_received': 0, 'quotation_approved': 1,
  'wo_issued': 1, 'dispatched': 2,
  'at_gate': 3, 'documents_uploaded': 4,
  'bill_released': 5,
  'RFQ_Sent': 0, 'PO_Created': 1,
};

const STEP_LABELS = [
  'Step 1: Quotation', 'Step 2: Work Order', 'Step 3: Dispatched',
  'Step 4: Gate Entry', 'Step 5: Documents', 'Step 6: Bill Released'
];

export default function WorkflowStatus() {
  const [procurements, setProcurements] = useState([]);
  const [filteredProcurements, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stepFilter, setStepFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [vendors, setVendors] = useState([]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let filtered = [...procurements];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.pr_number?.toLowerCase().includes(term) ||
        p.requestNo?.toLowerCase().includes(term) ||
        p.workOrders?.some(wo => wo.wo_number?.toLowerCase().includes(term))
      );
    }
    if (stepFilter !== 'all') {
      const step = parseInt(stepFilter);
      filtered = filtered.filter(p => (STATUS_TO_STEP[p.status] || 0) === step);
    }
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(p =>
        p.workOrders?.some(wo => wo.vendor_id?.toString() === vendorFilter) ||
        p.quote_submissions?.some(qs => qs.vendor_id?.toString() === vendorFilter)
      );
    }
    setFiltered(filtered);
  }, [procurements, searchTerm, stepFilter, vendorFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prRes, woRes, geRes, billRes] = await Promise.all([
        api.get('/purchase-requests'),
        api.get('/work-orders').catch(() => ({ data: { data: [] } })),
        api.get('/gate-entry').catch(() => ({ data: { data: [] } })),
        api.get('/billing').catch(() => ({ data: { data: [] } })),
      ]);

      const prs = getPayload(prRes, []);
      const wos = getPayload(woRes, []);
      const ges = getPayload(geRes, []);
      const bills = getPayload(billRes, []);

      // Build vendor list
      const vendorMap = {};
      wos.forEach(wo => {
        if (wo.vendor) vendorMap[wo.vendor.id] = wo.vendor.name;
      });
      setVendors(Object.entries(vendorMap).map(([id, name]) => ({ id, name })));

      // Enrich PRs with related data
      const enriched = prs.map(pr => {
        const prWorkOrders = wos.filter(wo => wo.request_id === pr.id);
        const prGateEntries = ges.filter(ge => prWorkOrders.some(wo => wo.wo_id === ge.wo_id));
        const prBills = bills.filter(b => prGateEntries.some(ge => ge.entry_id === b.entry_id));
        const daysActive = Math.ceil((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...pr,
          workOrders: prWorkOrders,
          gateEntries: prGateEntries,
          billingDocs: prBills,
          daysActive,
          currentStep: STATUS_TO_STEP[pr.status] || 0,
          vendorName: prWorkOrders[0]?.vendor?.name || 'N/A',
        };
      });

      setProcurements(enriched);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workflow Status</h1>
            <p className="text-blue-200 text-sm mt-1">Track all active procurements across the 6-step billing workflow</p>
          </div>
        </div>
      </div>

      {/* Step Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {STEP_LABELS.map((label, i) => {
          const count = procurements.filter(p => p.currentStep === i).length;
          return (
            <button key={i} onClick={() => setStepFilter(stepFilter === i.toString() ? 'all' : i.toString())}
              className={`p-3 rounded-xl border text-center transition ${
                stepFilter === i.toString() ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-slate-50'
              }`}>
              <div className="text-xl font-bold text-slate-800">{count}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by PR or WO number..." className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <select value={stepFilter} onChange={e => setStepFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">All Steps</option>
          {STEP_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
        </select>
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading procurement data...</div>
      ) : filteredProcurements.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-600">No matching procurements found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">PR Number</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Product</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Vendor</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Current Step</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Days</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 w-10"></th>
            </tr></thead>
            <tbody className="divide-y">
              {filteredProcurements.map(pr => (
                <ProcurementRow key={pr.id} pr={pr} expanded={expandedId === pr.id}
                  onToggle={() => setExpandedId(expandedId === pr.id ? null : pr.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

function ProcurementRow({ pr, expanded, onToggle }) {
  const firstItem = pr.items?.[0];
  const productName = firstItem?.product?.name || firstItem?.customProductName || 'N/A';
  const itemCount = pr.items?.length || 0;

  const statusColor = {
    'Pending': 'bg-slate-100 text-slate-600',
    'Approved': 'bg-blue-100 text-blue-700',
    'rfq_sent': 'bg-indigo-100 text-indigo-700',
    'quotation_received': 'bg-purple-100 text-purple-700',
    'quotation_approved': 'bg-violet-100 text-violet-700',
    'wo_issued': 'bg-sky-100 text-sky-700',
    'dispatched': 'bg-orange-100 text-orange-700',
    'at_gate': 'bg-amber-100 text-amber-700',
    'documents_uploaded': 'bg-cyan-100 text-cyan-700',
    'bill_released': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 font-semibold text-blue-700">{pr.pr_number || pr.requestNo}</td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span>{productName}</span>
          {itemCount > 1 && <span className="text-slate-400 text-xs ml-1">+{itemCount - 1}</span>}
        </td>
        <td className="px-4 py-3">{pr.vendorName}</td>
        <td className="px-4 py-3"><WorkflowTracker currentStep={pr.currentStep} compact /></td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[pr.status] || 'bg-slate-100'}`}>
            {pr.status?.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={`text-xs font-medium ${pr.daysActive > 14 ? 'text-red-600' : pr.daysActive > 7 ? 'text-amber-600' : 'text-slate-500'}`}>
            {pr.daysActive}d
          </span>
        </td>
        <td className="px-4 py-3">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-slate-50/50">
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
              {/* Full WorkflowTracker */}
              <div className="bg-white rounded-xl p-4 border">
                <WorkflowTracker currentStep={pr.currentStep} />
              </div>

              {/* Detail Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* PR Info */}
                <div className="bg-white rounded-xl p-4 border space-y-2">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4" /> Purchase Request</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Number:</span><span className="font-medium">{pr.pr_number || pr.requestNo}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Priority:</span><span>{pr.priority}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Created:</span><span>{new Date(pr.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">User:</span><span>{pr.user?.name}</span></div>
                  </div>
                </div>

                {/* Work Orders */}
                <div className="bg-white rounded-xl p-4 border space-y-2">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2"><Package className="w-4 h-4" /> Work Orders</h4>
                  {pr.workOrders?.length > 0 ? pr.workOrders.map(wo => (
                    <div key={wo.wo_id} className="text-sm space-y-1 border-t pt-2 first:border-0 first:pt-0">
                      <div className="flex justify-between"><span className="text-slate-500">WO#:</span><span className="font-medium">{wo.wo_number}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Status:</span><span>{wo.status}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Amount:</span><span>₹{Number(wo.agreed_price).toLocaleString('en-IN')}</span></div>
                      {wo.dispatched_at && <div className="flex justify-between"><span className="text-slate-500">Dispatched:</span><span>{new Date(wo.dispatched_at).toLocaleDateString()}</span></div>}
                    </div>
                  )) : <p className="text-sm text-slate-400">No work orders yet</p>}
                </div>

                {/* Gate Entry & Billing */}
                <div className="bg-white rounded-xl p-4 border space-y-2">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2"><Shield className="w-4 h-4" /> Gate & Billing</h4>
                  {pr.gateEntries?.length > 0 ? pr.gateEntries.map(ge => (
                    <div key={ge.entry_id} className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Entry#:</span><span className="font-medium">{ge.entry_number}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Status:</span><span>{ge.status}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Vehicle:</span><span>{ge.vehicle_number}</span></div>
                    </div>
                  )) : <p className="text-sm text-slate-400">No gate entries yet</p>}

                  {pr.billingDocs?.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      {pr.billingDocs.map(bd => (
                        <div key={bd.doc_id} className="text-sm space-y-1">
                          <div className="flex justify-between"><span className="text-slate-500">Bill Status:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              bd.status === 'released' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>{bd.status}</span>
                          </div>
                          {bd.bill_released_at && <div className="flex justify-between"><span className="text-slate-500">Released:</span><span>{new Date(bd.bill_released_at).toLocaleDateString()}</span></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </>
  );
}
