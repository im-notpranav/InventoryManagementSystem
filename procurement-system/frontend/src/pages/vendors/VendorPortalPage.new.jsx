import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, CheckCircle, XCircle, Edit3, Clock, Building2,
  FileText, AlertTriangle, Truck, Calendar, DollarSign,
  Send, History, ClipboardList, RefreshCw, Eye, ChevronRight,
  Star, MapPin, Phone, Mail, TrendingUp, ShoppingCart
} from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/auth.store';

export default function VendorPortalPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  // Active tab
  const [activeTab, setActiveTab] = useState('orders');
  
  // Profile & Stats
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Quotations state
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ items: [], deliveryDays: '', terms: '', notes: '' });
  
  // Delivery state
  const [deliveryForm, setDeliveryForm] = useState({ status: '', trackingNumber: '', notes: '' });
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  
  // History state
  const [orderHistory, setOrderHistory] = useState({ orders: [], summary: {} });
  const [quotationHistory, setQuotationHistory] = useState({ quotations: [], summary: {} });
  
  // Action modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');

  // Load data on mount
  useEffect(() => {
    fetchProfile();
    fetchOrders();
    // Also fetch RFQs to show pending count in tab badge
    fetchRfqs();
  }, []);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === 'quotations') {
      fetchRfqs();
      fetchQuotations();
    } else if (activeTab === 'history') {
      fetchOrderHistory();
      fetchQuotationHistory();
    }
  }, [activeTab]);

  // Load specific order if orderId in URL
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(parseInt(orderId));
    }
  }, [orderId]);

  // ─── API CALLS ────────────────────────────────────────────────

  const fetchProfile = async () => {
    try {
      const res = await api.get('/vendor-portal/profile');
      setVendorProfile(res.data?.data || null);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(err.response?.data?.message || 'Failed to load vendor profile');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor-portal/orders');
      setOrders(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (id) => {
    try {
      const res = await api.get(`/vendor-portal/orders/${id}`);
      setSelectedOrder(res.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
    }
  };

  const fetchRfqs = async () => {
    try {
      console.log('Fetching RFQs...');
      const response = await api.get('/vendor-portal/rfqs');
      console.log('RFQ response:', response);
      // axios interceptor returns response.data, so we get { success, data, message }
      // The actual RFQ array is in response.data
      const rfqData = response?.data || [];
      console.log('RFQ data:', rfqData);
      setRfqs(Array.isArray(rfqData) ? rfqData : []);
    } catch (err) {
      console.error('Failed to fetch RFQs:', err);
      setRfqs([]);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await api.get('/vendor-portal/quotations');
      const quotationData = response?.data || [];
      setQuotations(Array.isArray(quotationData) ? quotationData : []);
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
      setQuotations([]);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const res = await api.get('/vendor-portal/history/orders');
      setOrderHistory(res.data?.data || { orders: [], summary: {} });
    } catch (err) {
      console.error('Failed to fetch order history:', err);
    }
  };

  const fetchQuotationHistory = async () => {
    try {
      const res = await api.get('/vendor-portal/history/quotations');
      setQuotationHistory(res.data?.data || { quotations: [], summary: {} });
    } catch (err) {
      console.error('Failed to fetch quotation history:', err);
    }
  };

  // ─── ORDER ACTIONS ────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!selectedOrder) return;
    try {
      await api.post(`/vendor-portal/orders/${selectedOrder.id}/confirm`, {
        message: actionMessage,
        expectedDeliveryDate: expectedDelivery || null,
      });
      setShowConfirmModal(false);
      setActionMessage('');
      setExpectedDelivery('');
      fetchOrders();
      fetchOrderDetails(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !actionMessage) return;
    try {
      await api.post(`/vendor-portal/orders/${selectedOrder.id}/reject`, {
        reason: actionMessage,
      });
      setShowRejectModal(false);
      setActionMessage('');
      fetchOrders();
      fetchOrderDetails(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject order');
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedOrder || !actionMessage) return;
    try {
      await api.post(`/vendor-portal/orders/${selectedOrder.id}/request-changes`, {
        message: actionMessage,
      });
      setShowChangesModal(false);
      setActionMessage('');
      fetchOrders();
      fetchOrderDetails(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request changes');
    }
  };

  const handleDeliveryUpdate = async () => {
    if (!selectedOrder || !deliveryForm.status) return;
    try {
      await api.post(`/vendor-portal/orders/${selectedOrder.id}/update-delivery`, deliveryForm);
      setShowDeliveryModal(false);
      setDeliveryForm({ status: '', trackingNumber: '', notes: '' });
      fetchOrders();
      fetchOrderDetails(selectedOrder.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update delivery status');
    }
  };

  // ─── QUOTATION ACTIONS ────────────────────────────────────────

  const handleSubmitQuote = async () => {
    if (!selectedRfq || quoteForm.items.length === 0) return;
    try {
      console.log('Submitting quote:', { rfqId: selectedRfq.id, quoteForm });
      await api.post(`/vendor-portal/rfqs/${selectedRfq.id}/quote`, quoteForm);
      setShowQuoteModal(false);
      setQuoteForm({ items: [], deliveryDays: '', terms: '', notes: '' });
      setSelectedRfq(null);
      fetchRfqs();
      fetchQuotations();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit quotation');
    }
  };

  const initQuoteForm = (rfq) => {
    setSelectedRfq(rfq);
    const items = rfq.request.items.map(item => ({
      productId: item.productId,
      customProductName: item.customProductName,
      quantity: item.quantity,
      unitPrice: item.product?.price || item.customEstimatedPrice || 0,
    }));
    setQuoteForm({ items, deliveryDays: '', terms: '', notes: '' });
    setShowQuoteModal(true);
  };

  // ─── STYLING HELPERS ──────────────────────────────────────────

  const statusColors = {
    Draft: 'bg-slate-100 text-slate-700',
    Sent: 'bg-blue-100 text-blue-700',
    Acknowledged: 'bg-emerald-100 text-emerald-700',
    Changes_Requested: 'bg-amber-100 text-amber-700',
    Rejected_By_Vendor: 'bg-red-100 text-red-700',
    Completed: 'bg-green-100 text-green-700',
    In_Transit: 'bg-purple-100 text-purple-700',
  };

  const quoteStatusColors = {
    Submitted: 'bg-blue-100 text-blue-700',
    Selected: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
  };

  const pendingCount = orders.filter(o => o.status === 'Sent' || o.status === 'Draft').length;
  const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const pendingRfqCount = rfqs.filter(r => !r.hasQuoted).length;

  const tabs = [
    { id: 'orders', label: 'Purchase Orders', icon: Package, count: orders.length },
    { id: 'quotations', label: 'Quotations', icon: FileText, count: pendingRfqCount, badge: pendingRfqCount > 0 ? 'New' : null },
    { id: 'history', label: 'History', icon: History },
  ];

  // ─── RENDER ───────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header with Vendor Profile */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{vendorProfile?.vendor?.name || 'Vendor Portal'}</h1>
              <p className="text-blue-100 text-sm mt-1">Welcome back, {user?.name}</p>
              {vendorProfile?.vendor?.email && (
                <p className="text-blue-200 text-xs mt-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {vendorProfile.vendor.email}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vendorProfile?.vendor?.rating > 0 && (
              <div className="bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="font-semibold">{vendorProfile.vendor.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold">{vendorProfile?.stats?.totalOrders || orders.length}</div>
            <div className="text-blue-200 text-sm">Total Orders</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold">{vendorProfile?.stats?.pendingOrders || pendingCount}</div>
            <div className="text-blue-200 text-sm">Pending Action</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold">₹{((vendorProfile?.stats?.totalValue || totalValue) / 1000).toFixed(0)}K</div>
            <div className="text-blue-200 text-sm">Total Value</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold">{vendorProfile?.stats?.totalQuotations || 0}</div>
            <div className="text-blue-200 text-sm">Quotations</div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => { fetchProfile(); fetchOrders(); }} className="ml-auto text-red-600 hover:text-red-800">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-blue-500' : 'bg-slate-200'
              }`}>
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs font-semibold animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Orders List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Your Orders</h3>
                  <button onClick={fetchOrders} className="text-slate-400 hover:text-slate-600">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No purchase orders yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {orders.map(order => (
                      <button
                        key={order.id}
                        onClick={() => { setSelectedOrder(order); fetchOrderDetails(order.id); }}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition ${
                          selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800">PO-{order.orderNo?.slice(-8) || order.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-slate-100'}`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500">₹{Number(order.totalAmount).toLocaleString('en-IN')}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {order.items?.length || 0} items • {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Details */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">
                        PO-{selectedOrder.orderNo?.slice(-8) || selectedOrder.id}
                      </h3>
                      <p className="text-slate-500 text-sm">
                        Created {new Date(selectedOrder.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                      {selectedOrder.status?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Order Info */}
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Order Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Amount</span>
                          <span className="font-semibold">₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Payment Terms</span>
                          <span>{selectedOrder.paymentTerms || 'Standard'}</span>
                        </div>
                        {selectedOrder.expectedDelivery && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expected Delivery</span>
                            <span>{new Date(selectedOrder.expectedDelivery).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Requester</h4>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">{selectedOrder.request?.user?.name || 'N/A'}</div>
                        <div className="text-slate-500">{selectedOrder.request?.user?.department}</div>
                        {selectedOrder.request?.priority && (
                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              selectedOrder.request.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                              selectedOrder.request.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {selectedOrder.request.priority} Priority
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="px-6 pb-4">
                    <h4 className="text-sm font-medium text-slate-500 mb-3">Order Items</h4>
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                            <th className="text-center px-4 py-3 font-medium text-slate-600">Qty</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">Price</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3">
                                <div className="font-medium">{item.product?.name}</div>
                                <div className="text-xs text-slate-500">{item.product?.sku}</div>
                              </td>
                              <td className="px-4 py-3 text-center">{item.quantityOrdered}</td>
                              <td className="px-4 py-3 text-right">₹{Number(item.priceEach).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right font-medium">
                                ₹{(item.quantityOrdered * item.priceEach).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {['Sent', 'Draft', 'Changes_Requested'].includes(selectedOrder.status) && (
                    <div className="px-6 py-4 bg-slate-50 border-t flex flex-wrap gap-3">
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4" /> Confirm Order
                      </button>
                      <button
                        onClick={() => setShowChangesModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                      >
                        <Edit3 className="w-4 h-4" /> Request Changes
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}

                  {/* Delivery Update for confirmed orders */}
                  {['Acknowledged', 'In_Transit'].includes(selectedOrder.status) && (
                    <div className="px-6 py-4 bg-slate-50 border-t">
                      <button
                        onClick={() => setShowDeliveryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Truck className="w-4 h-4" /> Update Delivery Status
                      </button>
                    </div>
                  )}

                  {/* Action History */}
                  {selectedOrder.portalActions?.length > 0 && (
                    <div className="px-6 py-4 border-t">
                      <h4 className="text-sm font-medium text-slate-500 mb-3">Activity History</h4>
                      <div className="space-y-3">
                        {selectedOrder.portalActions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              action.action === 'confirmed' ? 'bg-emerald-500' :
                              action.action === 'rejected' ? 'bg-red-500' :
                              action.action.startsWith('delivery') ? 'bg-purple-500' :
                              'bg-amber-500'
                            }`} />
                            <div className="flex-1">
                              <div className="font-medium capitalize">{action.action.replace(/_/g, ' ')}</div>
                              {action.message && <div className="text-slate-500">{action.message}</div>}
                              <div className="text-xs text-slate-400">
                                {new Date(action.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">Select an Order</h3>
                  <p className="text-slate-500">Click on an order from the list to view details</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'quotations' && (
          <motion.div
            key="quotations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            {/* Open RFQs */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  Open RFQs ({rfqs.filter(r => !r.hasQuoted).length} pending)
                </h3>
                <p className="text-sm text-slate-500">Submit quotations for these requests</p>
              </div>
              
              {rfqs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No open RFQs available</p>
                  <p className="text-xs mt-2">Check back later or contact admin</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {rfqs.map(rfq => (
                    <div key={rfq.id} className={`p-4 ${rfq.hasQuoted ? 'bg-slate-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800">RFQ-{rfq.rfqNo?.slice(-8)}</span>
                        <div className="flex items-center gap-2">
                          {rfq.hasQuoted && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                              Quoted
                            </span>
                          )}
                          {rfq.deadline && (
                            <span className="text-xs text-slate-500">
                              Due: {new Date(rfq.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 mb-3">
                        {rfq.request?.items?.length || 0} items • {rfq.request?.user?.department}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {rfq.request?.items?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-xs">
                            {item.product?.name || item.customProductName}
                          </span>
                        ))}
                      </div>
                      {rfq.hasQuoted ? (
                        <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-600 rounded-lg cursor-not-allowed">
                          <CheckCircle className="w-4 h-4" /> Already Quoted
                        </div>
                      ) : (
                        <button
                          onClick={() => initQuoteForm(rfq)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4" /> Submit Quotation
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submitted Quotations */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Your Quotations
                </h3>
                <p className="text-sm text-slate-500">Quotations you've submitted</p>
              </div>
              
              {quotations.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No quotations submitted yet</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {quotations.map(quote => (
                    <div key={quote.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800">
                          Quote for RFQ-{quote.rfq?.rfqNo?.slice(-8)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${quoteStatusColors[quote.status]}`}>
                          {quote.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Total:</span>
                          <span className="ml-1 font-medium">₹{Number(quote.totalAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Items:</span>
                          <span className="ml-1">{quote.items?.length || 0}</span>
                        </div>
                        {quote.deliveryDays && (
                          <div>
                            <span className="text-slate-500">Delivery:</span>
                            <span className="ml-1">{quote.deliveryDays} days</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Submitted:</span>
                          <span className="ml-1">{new Date(quote.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="text-2xl font-bold text-slate-800">{orderHistory.summary?.totalOrders || 0}</div>
                <div className="text-sm text-slate-500">Total Orders</div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-2xl font-bold text-emerald-600">
                  ₹{((orderHistory.summary?.totalValue || 0) / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-slate-500">Order Value</div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-2xl font-bold text-blue-600">{quotationHistory.summary?.totalQuotations || 0}</div>
                <div className="text-sm text-slate-500">Quotations</div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-2xl font-bold text-amber-600">{quotationHistory.summary?.accepted || 0}</div>
                <div className="text-sm text-slate-500">Won Quotes</div>
              </div>
            </div>

            {/* Orders History Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-600" />
                  Order History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Order</th>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                      <th className="text-center px-4 py-3 font-medium">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orderHistory.orders?.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">PO-{order.orderNo?.slice(-8)}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[order.status]}`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(order.totalAmount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">{order.items?.length || 0}</td>
                      </tr>
                    ))}
                    {(!orderHistory.orders || orderHistory.orders.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No order history</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      
      {/* Confirm Order Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                Confirm Order
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message (Optional)</label>
                  <textarea
                    value={actionMessage}
                    onChange={(e) => setActionMessage(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleConfirm} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Confirm Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Order Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
                Reject Order
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="Please explain why you're rejecting this order..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button 
                  onClick={handleReject} 
                  disabled={!actionMessage || actionMessage.length < 5}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Changes Modal */}
      <AnimatePresence>
        {showChangesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowChangesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Edit3 className="w-6 h-6 text-amber-600" />
                Request Changes
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What changes do you need? *</label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="Describe the changes you need (pricing, quantities, terms, etc.)..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowChangesModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button 
                  onClick={handleRequestChanges}
                  disabled={!actionMessage || actionMessage.length < 10}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery Update Modal */}
      <AnimatePresence>
        {showDeliveryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeliveryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Truck className="w-6 h-6 text-purple-600" />
                Update Delivery Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                  <select
                    value={deliveryForm.status}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select status...</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={deliveryForm.trackingNumber}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, trackingNumber: e.target.value })}
                    placeholder="Enter tracking number..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={deliveryForm.notes}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeliveryModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button 
                  onClick={handleDeliveryUpdate}
                  disabled={!deliveryForm.status}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Update Status
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Quote Modal */}
      <AnimatePresence>
        {showQuoteModal && selectedRfq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowQuoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Send className="w-6 h-6 text-blue-600" />
                Submit Quotation for RFQ-{selectedRfq.rfqNo?.slice(-8)}
              </h3>
              
              <div className="space-y-4">
                {/* Items */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Item Pricing</label>
                  <div className="space-y-3">
                    {quoteForm.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {selectedRfq.request.items[idx]?.product?.name || item.customProductName}
                          </div>
                          <div className="text-xs text-slate-500">Qty: {item.quantity}</div>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const newItems = [...quoteForm.items];
                              newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                              setQuoteForm({ ...quoteForm, items: newItems });
                            }}
                            placeholder="Unit Price"
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div className="w-24 text-right font-medium text-sm">
                          ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-right font-bold">
                    Total: ₹{quoteForm.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Days</label>
                    <input
                      type="number"
                      value={quoteForm.deliveryDays}
                      onChange={(e) => setQuoteForm({ ...quoteForm, deliveryDays: e.target.value })}
                      placeholder="e.g., 7"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Terms</label>
                    <input
                      type="text"
                      value={quoteForm.terms}
                      onChange={(e) => setQuoteForm({ ...quoteForm, terms: e.target.value })}
                      placeholder="e.g., Net 30"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowQuoteModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitQuote}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Quotation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
