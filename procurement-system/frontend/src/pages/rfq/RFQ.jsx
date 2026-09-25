import { useEffect, useMemo, useState } from 'react';
import { FileSearch, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { getAllRFQs, sendRFQ, compareQuotes, selectQuote, resendRFQ } from '../../api/rfq.api';
import { vendorsApi } from '../../api/index.js';

export default function RFQPage() {
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [inviteRequest, setInviteRequest] = useState(null);
  const [inviteVendorId, setInviteVendorId] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [inviteValidityDate, setInviteValidityDate] = useState('');

  const [compareRequest, setCompareRequest] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetchPageData();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchPageData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rfqRes, vendorRes] = await Promise.all([getAllRFQs(), vendorsApi.getAll()]);
      setRfqs(rfqRes?.data || []);
      setVendors((vendorRes?.data || []).filter((vendor) => vendor.status === 'Active'));
    } catch (err) {
      setError(err?.message || 'Failed to load RFQ data.');
    } finally {
      setLoading(false);
    }
  };

  const openInviteModal = (rfq) => {
    setInviteRequest(rfq);
    setInviteVendorId('');
    setInviteNotes('');
    setInviteValidityDate('');
  };

  const availableVendors = useMemo(() => {
    if (!inviteRequest) return [];
    const invitedVendorIds = new Set((inviteRequest.invited_vendors || []).map((vendor) => vendor.vendor_id));
    return vendors.filter((vendor) => !invitedVendorIds.has(vendor.id));
  }, [inviteRequest, vendors]);

  const submitInvite = async () => {
    if (!inviteRequest || !inviteVendorId) return;
    const vendor = vendors.find((v) => v.id === Number(inviteVendorId));
    try {
      await sendRFQ({
        request_id: inviteRequest.request_id,
        vendor_id: Number(inviteVendorId),
        notes: inviteNotes || null,
        validity_date: inviteValidityDate || null,
      });
      setToast(`RFQ sent to ${vendor?.name || 'vendor'}`);
      setInviteRequest(null);
      await fetchPageData();
    } catch (err) {
      setError(err?.message || 'Failed to send RFQ.');
    }
  };

  const openCompareView = async (rfq) => {
    setCompareRequest(rfq);
    setComparison(null);
    setCompareLoading(true);
    try {
      const response = await compareQuotes(rfq.request_id);
      setComparison(response?.data || null);
    } catch (err) {
      setError(err?.message || 'Failed to load quote comparison.');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleResend = async (quote) => {
    try {
      await resendRFQ(quote.quote_id);
      setToast(`RFQ resent to ${quote.vendor_name}`);
      await fetchPageData();
      if (compareRequest) {
        await openCompareView(compareRequest);
      }
    } catch (err) {
      setError(err?.message || 'Failed to resend RFQ.');
    }
  };

  const handleSelectQuote = async (quoteId) => {
    try {
      await selectQuote(quoteId);
      setToast('PO generated and sent to vendor');
      await fetchPageData();
      if (compareRequest) {
        await openCompareView(compareRequest);
      }
    } catch (err) {
      setError(err?.message || 'Failed to select quote.');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileSearch className="h-6 w-6 text-indigo-600" />
            RFQ Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">Open invitations, quote comparison, and PO generation</p>
        </div>
        <button
          onClick={fetchPageData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">PR Number</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Quantity</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-500">Vendors Invited</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-500">Quotes Received</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(rfqs || []).map((rfq) => (
              <tr key={rfq.request_id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3.5 font-medium text-indigo-700">{rfq.pr_number}</td>
                <td className="px-6 py-3.5 text-slate-700">{rfq.product_name}</td>
                <td className="px-6 py-3.5 text-slate-700">{rfq.quantity}</td>
                <td className="px-6 py-3.5 text-center">{rfq.vendors_invited}</td>
                <td className="px-6 py-3.5 text-center">{rfq.quotes_received}</td>
                <td className="px-6 py-3.5">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {rfq.status}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openCompareView(rfq)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      View Quotes
                    </button>
                    <button
                      onClick={() => openInviteModal(rfq)}
                      className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      Invite Vendor
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && (!rfqs || rfqs.length === 0) && (
          <div className="px-6 py-10 text-center text-slate-400">No RFQs available.</div>
        )}
      </div>

      {compareRequest && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-800">Quote Comparison</h3>
            <p className="text-sm text-slate-500">
              {compareRequest.pr_number} • {compareRequest.product_name} • Qty {compareRequest.quantity}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Vendor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Rating</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Delivery Days</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Valid Until</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Score</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(comparison?.quotes || []).map((quote) => {
                  const isRecommended = comparison?.recommended_vendor_id === quote.vendor_id;
                  return (
                    <tr key={quote.quote_id} className={isRecommended ? 'bg-emerald-50/70' : 'hover:bg-slate-50/60'}>
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-slate-800">{quote.vendor_name}</div>
                        <div className="text-xs text-slate-500">{quote.vendor_email}</div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-700">{Number(quote.vendor_rating || 0).toFixed(1)}/5</td>
                      <td className="px-6 py-3.5 text-right text-slate-700">₹{Number(quote.unit_price || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3.5 text-right font-medium text-slate-800">₹{Number(quote.total_price || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3.5 text-slate-700">{quote.delivery_days ?? '—'}</td>
                      <td className="px-6 py-3.5 text-slate-700">
                        {quote.validity_date ? new Date(quote.validity_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-700">{Number(quote.score || 0).toFixed(3)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-2">
                          {quote.is_selected ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Selected
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSelectQuote(quote.quote_id)}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              Select &amp; Generate PO
                            </button>
                          )}
                          <button
                            onClick={() => handleResend(quote)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Resend
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {compareLoading && <div className="px-6 py-6 text-sm text-slate-500">Loading comparison...</div>}
          {!compareLoading && (comparison?.quotes || []).length === 0 && (
            <div className="px-6 py-8 text-center text-slate-400">No quotes found for this request.</div>
          )}
        </div>
      )}

      {inviteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Invite Vendor</h3>
            <p className="mt-1 text-sm text-slate-500">{inviteRequest.pr_number}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Vendor</label>
                <select
                  value={inviteVendorId}
                  onChange={(event) => setInviteVendorId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select vendor...</option>
                  {availableVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={inviteNotes}
                  onChange={(event) => setInviteNotes(event.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Validity Date</label>
                <input
                  type="date"
                  value={inviteValidityDate}
                  onChange={(event) => setInviteValidityDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setInviteRequest(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitInvite}
                disabled={!inviteVendorId}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Send RFQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
