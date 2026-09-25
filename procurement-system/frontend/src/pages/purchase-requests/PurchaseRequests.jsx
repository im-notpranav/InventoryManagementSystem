import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, X, Loader2, FileText, Search, ChevronDown, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const priorityColors = {
  low: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  medium: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  high: { bg: '#fed7aa', color: '#9a3412', border: '#fdba74' },
  urgent: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
};

const statusColors = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  approved: { bg: '#dbeafe', color: '#1e40af' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
  rfq_sent: { bg: '#e0e7ff', color: '#3730a3' },
  dispatched: { bg: '#f3e8ff', color: '#6b21a8' },
  bill_released: { bg: '#dcfce7', color: '#166534' },
};

export default function PurchaseRequests() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState(null);

  // Form State
  const [items, setItems] = useState([{ product_id: '', product_name: '', sku: '', unit_price: 0, quantity: '1', estimated_cost: '', notes: '' }]);
  const [priority, setPriority] = useState('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [justification, setJustification] = useState('');
  const [budgetCode, setBudgetCode] = useState('');

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/purchase-requests');
      setData(res?.data?.data || res?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = async () => {
    setItems([{ product_id: '', product_name: '', sku: '', unit_price: 0, quantity: '1', estimated_cost: '', notes: '' }]);
    setPriority('medium');
    setRequiredDate('');
    setJustification('');
    setBudgetCode('');
    setModalError('');
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
    try {
      const pRes = await api.get('/products');
      setProducts(pRes?.data?.data || pRes?.data || []);
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalOpen) closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalOpen]);

  const handleProductSelect = (index, product) => {
    const newItems = [...items];
    newItems[index].product_id = product.product_id;
    newItems[index].product_name = product.name;
    newItems[index].sku = product.sku;
    newItems[index].unit_price = product.unit_price;
    const qty = parseFloat(newItems[index].quantity) || 0;
    if (product.unit_price && qty > 0) {
      newItems[index].estimated_cost = (product.unit_price * qty).toFixed(2);
    }
    setItems(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'quantity') {
      const qty = parseFloat(value) || 0;
      const up = newItems[index].unit_price || 0;
      if (up > 0) newItems[index].estimated_cost = (up * qty).toFixed(2);
    }
    setItems(newItems);
  };

  const addItem = () => {
    if (items.length < 10) {
      setItems([...items, { product_id: '', product_name: '', sku: '', unit_price: 0, quantity: '1', estimated_cost: '', notes: '' }]);
    }
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const totalEstimatedCost = items.reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);

  const handleSubmit = async () => {
    setModalError('');
    
    // Validation
    for (let i = 0; i < items.length; i++) {
      if (!items[i].product_id) return setModalError(`Please select a product for row ${i + 1}`);
      if (!items[i].quantity || parseFloat(items[i].quantity) < 1) return setModalError(`Quantity must be at least 1 for row ${i + 1}`);
    }

    setSubmitting(true);
    try {
      const body = {
        priority,
        justification: justification || null,
        required_date: requiredDate || null,
        estimated_cost: totalEstimatedCost > 0 ? totalEstimatedCost : null,
        budget_code: budgetCode || null,
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          estimated_cost: item.estimated_cost ? parseFloat(item.estimated_cost) : null,
          notes: item.notes || null,
        }))
      };
      
      const res = await api.post('/purchase-requests', body);
      const prNumber = res.data?.data?.pr_number || res.data?.pr_number || 'PR';
      showToast('success', `Purchase Request ${prNumber} created!`);
      closeModal();
      fetchData();
    } catch (err) {
      console.error('[PR CREATE ERROR]', err);
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Failed to create purchase request';
      setModalError(status === 500 ? 'Something went wrong. Please try again.' : message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  
  const getProductsSummary = (pr) => {
    if (pr.items && pr.items.length > 0) {
      if (pr.items.length > 2) return `${pr.items.length} items`;
      return pr.items.map(i => `${i.product?.name || 'Product'} ×${i.quantity}`).join(', ');
    }
    if (pr.product_id) return `${pr.product?.name || 'Product'} ×${pr.quantity || 1}`;
    return '—';
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700 }}>Purchase Requests</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {user?.role === 'Admin' ? 'Manage all purchase requests' : 'View your purchase requests'}
          </div>
        </div>
        <button onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
          <Plus size={16} /> New Purchase Request
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton-card" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : error ? (
        <div className="app-card" style={{ padding: 24, textAlign: 'center', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
          <div style={{ fontSize: 14 }}>{error}</div>
          <button onClick={fetchData} style={{ marginTop: 12, background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 10, padding: '8px 16px', cursor: 'pointer' }}>Retry</button>
        </div>
      ) : (!Array.isArray(data) || data.length === 0) ? (
        <div className="app-card" style={{ padding: 40, textAlign: 'center' }}>
          <FileText size={48} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: '#334155' }}>No purchase requests yet</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Click "New Purchase Request" to create your first one</div>
        </div>
      ) : (
        <div className="app-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['PR Number', 'Products Summary', 'Priority', 'Status', 'Requested By', 'Date', 'Est. Cost'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((pr) => {
                  const sc = statusColors[pr.status] || statusColors.pending;
                  const pc = priorityColors[pr.priority] || priorityColors.medium;
                  return (
                    <tr key={pr.request_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#1e3a5f' }}>{pr.pr_number}</td>
                      <td style={{ padding: '12px 14px' }}>{getProductsSummary(pr)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{pr.priority}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: sc.bg, color: sc.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{(pr.status || '').replace(/_/g, ' ')}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{pr.user?.name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>{fmtDate(pr.requested_at)}</td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}>{pr.estimated_cost ? `₹${Number(pr.estimated_cost).toLocaleString()}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 800, margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>New Purchase Request</div>
              <button onClick={closeModal} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 999, width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={14} /></button>
            </div>

            <div style={{ padding: 24 }}>
              {modalError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{modalError}</div>}

              {/* Products List */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 12 }}>Products Requested <span style={{ color: '#ef4444' }}>*</span></label>
                
                <div style={{ display: 'grid', gap: 12 }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      
                      <div style={{ flex: 2, position: 'relative' }}>
                        <select 
                          className="app-input" 
                          value={item.product_id}
                          onChange={(e) => {
                            const p = products.find(prod => prod.product_id === parseInt(e.target.value));
                            if (p) handleProductSelect(index, p);
                          }}
                        >
                          <option value="">Select a product...</option>
                          {products.map(p => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} {p.sku ? `(${p.sku})` : ''} {p.unit_price ? `— ₹${p.unit_price}/${p.unit || 'unit'}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ width: 80 }}>
                        <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="app-input" />
                      </div>

                      <div style={{ width: 120 }}>
                        <input type="number" min="0" placeholder="Est. ₹" value={item.estimated_cost} onChange={(e) => updateItem(index, 'estimated_cost', e.target.value)} className="app-input" />
                      </div>

                      <div style={{ flex: 1 }}>
                        <input type="text" placeholder="Notes (opt)" value={item.notes} onChange={(e) => updateItem(index, 'notes', e.target.value)} className="app-input" />
                      </div>

                      {items.length > 1 && (
                        <button onClick={() => removeItem(index)} style={{ padding: '10px 8px', background: 'transparent', border: 0, color: '#ef4444', cursor: 'pointer', opacity: 0.7 }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.7}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {items.length < 10 && (
                  <button onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed #cbd5e1', color: '#3b82f6', fontWeight: 600, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', marginTop: 12 }}>
                    <Plus size={14} /> Add Another Product
                  </button>
                )}
                
                <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 12 }}>
                  Total Estimated Cost: ₹{totalEstimatedCost.toLocaleString()}
                </div>
              </div>

              {/* Other Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Priority</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['low', 'medium', 'high', 'urgent'].map((pr) => {
                      const pc = priorityColors[pr];
                      const active = priority === pr;
                      return (
                        <button key={pr} onClick={() => setPriority(pr)} style={{ padding: '6px 14px', borderRadius: 999, border: active ? `2px solid ${pc.color}` : '1px solid #e2e8f0', background: active ? pc.bg : '#fff', color: active ? pc.color : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
                          {pr}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Required By Date</label>
                  <input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} className="app-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Budget Code</label>
                  <input type="text" placeholder="Optional" value={budgetCode} onChange={(e) => setBudgetCode(e.target.value)} className="app-input" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Justification / Reason</label>
                  <textarea rows={1} placeholder="Why are these items needed?" value={justification} onChange={(e) => setJustification(e.target.value)} className="app-input" />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', color: '#64748b', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 10, padding: '10px 22px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {submitting && <Loader2 size={14} className="spin" />}
                {submitting ? 'Creating...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999, borderRadius: 12, padding: '12px 16px', border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#86efac'}`, background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', color: toast.type === 'error' ? '#991b1b' : '#166534', animation: 'slideInRight .2s ease', fontSize: 14 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
