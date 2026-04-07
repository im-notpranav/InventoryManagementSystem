import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, CheckCircle, XCircle, Edit3, Clock, Building2,
  FileText, AlertTriangle, Truck, Calendar, DollarSign
} from 'lucide-react';
import api from '../../api/axios';
import useAuthStore from '../../store/auth.store';

export default function VendorPortalPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState(null);
  
  // Action modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');

  // Load vendor profile and orders on mount
  useEffect(() => {
    fetchProfile();
    fetchOrders();
  }, []);

  // Load specific order if orderId in URL
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(parseInt(orderId));
    }
  }, [orderId]);

  const [error, setError] = useState(null);

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

  const handleReject = async () => {
    if (!selectedOrder || !actionMessage) return;
    try {
      await api.post(`/vendor-portal/orders/${selectedOrder.id}/reject`, {
        reason: actionMessage,  // Backend expects 'reason' not 'message'
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

  const handleConfirm = async () => {
    if (!selectedOrder) return;
    try {
      await api.post(`/vendor-portal/orders/${selectedOrder.id}/confirm`, {
        message: actionMessage,
        expectedDeliveryDate: expectedDelivery || null,  // Backend expects 'expectedDeliveryDate'
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

  const statusColors = {
    Draft: 'bg-slate-100 text-slate-700',
    Sent: 'bg-blue-100 text-blue-700',
    Acknowledged: 'bg-emerald-100 text-emerald-700',
    Changes_Requested: 'bg-amber-100 text-amber-700',
    Rejected_By_Vendor: 'bg-red-100 text-red-700',
    Completed: 'bg-green-100 text-green-700',
  };

  const pendingCount = orders.filter(o => o.status === 'Sent' || o.status === 'Draft').length;
  const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Vendor Portal
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Welcome, {vendorProfile?.vendor?.name || user?.name}
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{vendorProfile?.stats?.totalOrders || orders.length}</div>
              <div className="text-sm text-slate-500">Total Orders</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{vendorProfile?.stats?.pendingOrders || pendingCount}</div>
              <div className="text-sm text-slate-500">Pending Action</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">₹{(vendorProfile?.stats?.totalValue || totalValue).toLocaleString('en-IN')}</div>
              <div className="text-sm text-slate-500">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Your Purchase Orders</h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No purchase orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      navigate(`/vendor-portal/${order.id}`);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition ${
                      selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">PO-{order.orderNo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || ''}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-IN')}
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
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">PO-{selectedOrder.orderNo}</h3>
                  <p className="text-sm text-slate-500">
                    Created {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status] || ''}`}>
                  {selectedOrder.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Items Table */}
              <div className="p-6">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Order Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-slate-600">Product</th>
                        <th className="text-center px-4 py-2 text-slate-600">Qty</th>
                        <th className="text-right px-4 py-2 text-slate-600">Unit Price</th>
                        <th className="text-right px-4 py-2 text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {item.product?.name || 'Item'}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {item.quantityOrdered}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            ₹{Number(item.priceEach).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">
                            ₹{(item.quantityOrdered * item.priceEach).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-700">
                          Grand Total:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Order Info */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> Payment Terms
                    </div>
                    <div className="font-medium text-slate-700">
                      {selectedOrder.paymentTerms || 'Standard (Net 30)'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Expected Delivery
                    </div>
                    <div className="font-medium text-slate-700">
                      {selectedOrder.expectedDelivery
                        ? new Date(selectedOrder.expectedDelivery).toLocaleDateString('en-IN')
                        : 'To be confirmed'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Only show for pending orders */}
                {(selectedOrder.status === 'Sent' || selectedOrder.status === 'Draft') && (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> Confirm Order
                    </button>
                    <button
                      onClick={() => setShowChangesModal(true)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-5 h-5" /> Request Changes
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                  </div>
                )}

                {/* Portal Actions History */}
                {selectedOrder.portalActions?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-slate-700 mb-3">Action History</h4>
                    <div className="space-y-2">
                      {selectedOrder.portalActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm bg-slate-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            action.action === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                            action.action === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {action.action === 'confirmed' ? <CheckCircle className="w-4 h-4" /> :
                             action.action === 'rejected' ? <XCircle className="w-4 h-4" /> :
                             <Edit3 className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-700 capitalize">
                              {action.action.replace(/_/g, ' ')}
                            </div>
                            {action.message && (
                              <div className="text-slate-500 mt-0.5">{action.message}</div>
                            )}
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(action.createdAt).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Select an Order</h3>
              <p className="text-slate-500 mt-1">Choose an order from the list to view details and take action</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Confirm Order
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Message (optional)
                  </label>
                  <textarea
                    value={actionMessage}
                    onChange={(e) => setActionMessage(e.target.value)}
                    placeholder="Any notes about the order..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowConfirmModal(false); setActionMessage(''); setExpectedDelivery(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Confirm Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Reject Order
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason for rejection *
                </label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="Please explain why you cannot fulfill this order..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowRejectModal(false); setActionMessage(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!actionMessage}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Changes Modal */}
      <AnimatePresence>
        {showChangesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" /> Request Changes
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  What changes do you need? *
                </label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="Describe the changes needed (pricing, quantity, delivery terms, etc.)..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowChangesModal(false); setActionMessage(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={!actionMessage}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
