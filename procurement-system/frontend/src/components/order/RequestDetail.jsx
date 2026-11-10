// Full order trail for one purchase request + the HOD's next action.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Send, Trophy, Clock, RotateCcw, ClipboardCheck, Printer, Mail } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button, Field, Textarea, Input, SearchInput, Checkbox, StatusBadge, Badge, KV, PageSkeleton, useToast } from '../ui';
import WorkflowTracker from '../WorkflowTracker';
import { orderStep } from '../../lib/status';
import { dataOf, errMsg, fmtDate, fmtDateTime, fmtINR, cn } from '../../lib/utils';
import { DocLink, ItemsList, SectionTitle, ShipmentCard, ErrorNote } from './OrderParts';

const defaultClose = () => {
  const d = new Date(Date.now() + 3 * 864e5);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00`;
};

export default function RequestDetail({ requestId, open, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const isHod = user?.role === 'Admin';
  const [pr, setPr] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    if (!requestId) return;
    setError('');
    try {
      setPr(dataOf(await api.get(`/purchase-requests/${requestId}`), null));
    } catch (e) {
      setError(errMsg(e, 'Failed to load request'));
    }
  };
  useEffect(() => {
    if (open) { setPr(null); load(); }
  }, [open, requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (key, fn, success) => {
    setBusy(key);
    setError('');
    try {
      const res = await fn();
      toast.success(res?.data?.message || success);
      await load();
      onChanged?.();
      return true;
    } catch (e) {
      setError(errMsg(e));
      return false;
    } finally {
      setBusy('');
    }
  };

  const names = useMemo(() => new Map((pr?.items || []).map((i) => [i.item_id, i.product?.name])), [pr]);
  const wo = pr?.work_orders?.[0];

  return (
    <Modal open={open} onClose={onClose} size="full" title={pr?.pr_number || 'Purchase request'} description={pr ? `${pr.user?.name || ''}${pr.user?.department ? ` · ${pr.user.department}` : ''} · requested ${fmtDate(pr.requested_at)}` : undefined}>
      {!pr && !error && <PageSkeleton stats={0} />}
      {pr && (
        <div className="space-y-6">
          <WorkflowTracker currentStep={orderStep(pr)} rejected={pr.status === 'rejected'} compact />
          <ErrorNote>{error}</ErrorNote>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section>
                <SectionTitle aside={<StatusBadge status={pr.status} />}>Items</SectionTitle>
                <ItemsList items={pr.items} />
              </section>

              {isHod && pr.status === 'pending' && <DecisionPanel pr={pr} busy={busy} act={act} />}
              {isHod && ['approved', 'rfq_sent'].includes(pr.status) && <RfqPanel pr={pr} busy={busy} act={act} />}
              {pr.quote_submissions?.length > 0 && <QuotesPanel pr={pr} isHod={isHod} busy={busy} act={act} />}

              {wo && (
                <section className="space-y-3">
                  <SectionTitle aside={<Link to={`/work-orders/${wo.wo_id}/print`} target="_blank" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><Printer className="w-3.5 h-3.5" /> Print work order</Link>}>
                    Work order
                  </SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-surface p-3.5">
                    <KV label="Number" value={wo.wo_number} mono />
                    <KV label="Vendor" value={wo.vendor?.vendor_name} />
                    <KV label="Amount" value={fmtINR(wo.agreed_price)} />
                    <KV label="Deliver by" value={fmtDate(wo.delivery_deadline)} />
                  </div>
                  {wo.terms && <p className="text-xs text-slate-500">Terms: {wo.terms}</p>}
                  {wo.shipments?.length === 0 && <p className="text-sm text-slate-500">Waiting for the vendor's invoice and dispatch.</p>}
                  {wo.shipments?.map((s) => (
                    <ShipmentCard
                      key={s.shipment_id}
                      shipment={s}
                      names={names}
                      actions={
                        <>
                          {isHod && s.status === 'gate_blocked' && (
                            <Button size="xs" variant="warning" icon={RotateCcw} loading={busy === `retry-${s.shipment_id}`}
                              onClick={() => act(`retry-${s.shipment_id}`, () => api.post(`/shipments/${s.shipment_id}/allow-retry`), 'Retry allowed')}>
                              Allow retry
                            </Button>
                          )}
                          {s.status === 'received' && (
                            <Link to={`/goods-review?id=${s.shipment_id}`} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 text-white px-2.5 h-7 text-xs font-medium hover:bg-teal-700">
                              <ClipboardCheck className="w-3.5 h-3.5" /> Review goods
                            </Link>
                          )}
                        </>
                      }
                    />
                  ))}
                </section>
              )}
            </div>

            <aside className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-surface p-3.5 space-y-3">
                <KV label="Required by" value={pr.required_date ? fmtDate(pr.required_date) : '—'} />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-1">Principal's letter</p>
                  {pr.letter_url ? <DocLink url={pr.letter_url} label="View letter" /> : <Badge tone="slate">Legacy request — no letter</Badge>}
                </div>
                {pr.rfq_closes_at && <KV label="Quotes close" value={fmtDateTime(pr.rfq_closes_at)} />}
              </section>
              {pr.approval_logs?.length > 0 && (
                <section>
                  <SectionTitle>Decision</SectionTitle>
                  <ul className="space-y-2">
                    {pr.approval_logs.map((l) => (
                      <li key={l.log_id} className="text-xs text-slate-600">
                        <StatusBadge status={l.action} /> <span className="ml-1">{l.approver?.name} · {fmtDateTime(l.acted_at)}</span>
                        {l.comments && <p className="mt-1 text-slate-500">{l.comments}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {pr.vendor_rfqs?.length > 0 && (
                <section>
                  <SectionTitle>Vendors asked ({pr.vendor_rfqs.length})</SectionTitle>
                  <ul className="space-y-1.5">
                    {pr.vendor_rfqs.map((r) => (
                      <li key={r.rfq_id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-700">{r.vendor?.vendor_name} <span className="text-slate-400">{r.vendor?.email}</span></span>
                        <StatusBadge status={r.status === 'submitted' ? 'submitted' : r.vendor?.status === 'invited' ? 'invited' : 'pending'} dot={false} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      )}
      {!pr && error && <ErrorNote>{error}</ErrorNote>}
    </Modal>
  );
}

function DecisionPanel({ pr, busy, act }) {
  const [reason, setReason] = useState('');
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <SectionTitle>Your decision</SectionTitle>
      <Field label="Remarks" hint="Required when rejecting. Shown to the faculty member.">
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional for approval" />
      </Field>
      <div className="flex gap-2">
        <Button variant="success" icon={CheckCircle2} loading={busy === 'approve'}
          onClick={() => act('approve', () => api.put(`/purchase-requests/${pr.request_id}/approve`, { comments: reason }), 'Approved')}>
          Approve
        </Button>
        <Button variant="danger" icon={XCircle} loading={busy === 'reject'} disabled={!reason.trim()}
          onClick={() => act('reject', () => api.put(`/purchase-requests/${pr.request_id}/reject`, { reason }), 'Rejected')}>
          Reject
        </Button>
      </div>
    </section>
  );
}

function RfqPanel({ pr, busy, act }) {
  const [vendors, setVendors] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [emails, setEmails] = useState('');
  const [closesAt, setClosesAt] = useState(() => (pr.rfq_closes_at ? String(pr.rfq_closes_at).slice(0, 16) : defaultClose()));
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/vendors').then((r) => setVendors(dataOf(r).filter((v) => !v.is_blacklisted))).catch(() => setVendors([]));
  }, []);

  const asked = new Set((pr.vendor_rfqs || []).map((r) => r.vendor_id));
  const shown = vendors.filter((v) => !asked.has(v.vendor_id) && `${v.vendor_name} ${v.email}`.toLowerCase().includes(q.toLowerCase()));
  const emailList = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const count = picked.size + emailList.length;

  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const send = async () => {
    const okSent = await act('rfq', () => api.post(`/purchase-requests/${pr.request_id}/rfq`, {
      vendor_ids: [...picked], emails: emailList, closes_at: new Date(closesAt).toISOString(),
    }), 'RFQ sent');
    if (okSent) { setPicked(new Set()); setEmails(''); }
  };

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
      <SectionTitle>{pr.status === 'rfq_sent' ? 'Ask more vendors / extend closing date' : 'Send to vendors'}</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <SearchInput value={q} onChange={setQ} placeholder="Registered vendors…" />
          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-surface divide-y divide-slate-100">
            {shown.length === 0 && <p className="text-xs text-slate-400 p-3">No more registered vendors.</p>}
            {shown.map((v) => (
              <div key={v.vendor_id} className="px-3 py-2">
                <Checkbox checked={picked.has(v.vendor_id)} onChange={() => toggle(v.vendor_id)} label={v.vendor_name} description={v.email} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Other vendors (email)" hint="Comma or new line separated. They get an invite link and can quote immediately.">
            <Textarea rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="sales@supplier.com" />
          </Field>
          <Field label="Quotes close" required>
            <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </Field>
        </div>
      </div>
      <Button variant="violet" icon={Send} disabled={!count && pr.status !== 'rfq_sent'} loading={busy === 'rfq'} onClick={send}>
        {count ? `Send to ${count} vendor${count > 1 ? 's' : ''}` : 'Update closing date'}
      </Button>
    </section>
  );
}

function QuotesPanel({ pr, isHod, busy, act }) {
  const [choosing, setChoosing] = useState(null);
  const [terms, setTerms] = useState('');
  const subs = pr.quote_submissions;
  const open = pr.status === 'rfq_sent';
  const closed = pr.rfq_closes_at && new Date(pr.rfq_closes_at) <= new Date();
  const allIn = pr.vendor_rfqs?.length > 0 && pr.vendor_rfqs.every((r) => subs.some((s) => s.vendor_id === r.vendor_id));
  const canSelect = isHod && open && (closed || allIn || !pr.rfq_closes_at);

  const live = subs.filter((s) => s.status !== 'rejected');
  const lowest = Math.min(...live.map((s) => Number(s.total_price)));
  const fastest = Math.min(...live.filter((s) => s.expected_delivery).map((s) => new Date(s.expected_delivery).getTime()));
  const price = (s, itemId) => s.items?.find((x) => x.request_item_id === itemId)?.unit_price;

  return (
    <section className="space-y-3">
      <SectionTitle aside={open && !canSelect && isHod ? <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Select after {fmtDateTime(pr.rfq_closes_at)} or once all vendors reply</span> : null}>
        Quotations ({subs.length})
      </SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Vendor</th>
              {pr.items.map((i) => <th key={i.item_id} className="text-right px-3 py-2">{i.product?.name} <span className="normal-case text-slate-400">×{i.quantity}</span></th>)}
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-left px-3 py-2">Delivery</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subs.map((s) => {
              const isLow = s.status !== 'rejected' && Number(s.total_price) === lowest;
              const isFast = s.expected_delivery && new Date(s.expected_delivery).getTime() === fastest;
              return (
                <tr key={s.submission_id} className={cn(s.status === 'selected' && 'bg-emerald-50/60', s.status === 'rejected' && 'opacity-60')}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800">{s.vendor?.vendor_name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {isLow && <Badge tone="emerald">Lowest</Badge>}
                      {isFast && <Badge tone="blue">Fastest</Badge>}
                      {s.status !== 'pending' && <StatusBadge status={s.status} dot={false} />}
                    </div>
                  </td>
                  {pr.items.map((i) => (
                    <td key={i.item_id} className="px-3 py-2.5 text-right tabular text-slate-600">
                      {price(s, i.item_id) != null ? fmtINR(price(s, i.item_id), { decimals: true }) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right tabular font-semibold text-slate-900">{fmtINR(s.total_price)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{s.expected_delivery ? fmtDate(s.expected_delivery) : '—'}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <DocLink url={s.quotation_file_url} label="PDF" />
                    {canSelect && s.status === 'pending' && (
                      <Button size="xs" className="ml-2" icon={Trophy} onClick={() => { setChoosing(s); setTerms(''); }}>Select</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {subs.some((s) => s.notes) && (
        <ul className="text-xs text-slate-500 space-y-0.5">
          {subs.filter((s) => s.notes).map((s) => <li key={s.submission_id}><span className="font-medium text-slate-700">{s.vendor?.vendor_name}:</span> {s.notes}</li>)}
        </ul>
      )}

      {choosing && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <p className="text-sm text-slate-800">
            Issue the work order to <b>{choosing.vendor?.vendor_name}</b> for <b>{fmtINR(choosing.total_price)}</b>, delivery by <b>{fmtDate(choosing.expected_delivery)}</b>.
            Other vendors will be told their quote was not selected.
          </p>
          <Field label="Terms (optional)">
            <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms, warranty, penalties for delay…" />
          </Field>
          <div className="flex gap-2">
            <Button variant="success" icon={Mail} loading={busy === 'select'}
              onClick={async () => { if (await act('select', () => api.post(`/quotations/${choosing.submission_id}/select`, { terms }), 'Work order issued')) setChoosing(null); }}>
              Issue work order &amp; notify vendor
            </Button>
            <Button variant="secondary" onClick={() => setChoosing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
