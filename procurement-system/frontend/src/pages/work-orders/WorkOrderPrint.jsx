// Printable work order, built from the selected quotation. Opens in its own tab.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/axios';
import { MlritMark } from '../../components/brand/Brand';
import { Button } from '../../components/ui';
import { fmtDate, fmtINR, dataOf, errMsg } from '../../lib/utils';

export default function WorkOrderPrint() {
  const { id } = useParams();
  const [wo, setWo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/work-orders/${id}`).then((r) => setWo(dataOf(r, null))).catch((e) => setError(errMsg(e, 'Work order not found')));
  }, [id]);

  if (error) return <p className="p-10 text-center text-red-600">{error}</p>;
  if (!wo) return <p className="p-10 text-center text-slate-500">Loading…</p>;

  const lines = (wo.ledger || []).map((l) => ({ ...l, total: Number(l.unit_price || 0) * l.ordered }));
  const v = wo.vendor || {};

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0">
      <div className="mx-auto max-w-3xl bg-white text-slate-900 shadow-card print:shadow-none p-8 sm:p-10 space-y-6 text-sm">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <MlritMark className="w-12 h-12" title="MLRIT logo" />
            <div>
              <p className="font-bold text-base">MLR Institute of Technology</p>
              <p className="text-slate-500">{wo.request?.user?.department ? `Department of ${wo.request.user.department}` : 'Purchase department'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-tight">WORK ORDER</p>
            <p className="font-mono">{wo.wo_number}</p>
            <p className="text-slate-500">Date: {fmtDate(wo.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">To</p>
            <p className="font-semibold">{v.company_name || v.vendor_name}</p>
            {v.address && <p className="text-slate-600 whitespace-pre-line">{v.address}</p>}
            {v.email && <p className="text-slate-600">{v.email}</p>}
            {v.phone && <p className="text-slate-600">{v.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Reference</p>
            <p>Purchase request <span className="font-mono">{wo.request?.pr_number}</span></p>
            <p>Deliver by <span className="font-semibold">{fmtDate(wo.delivery_deadline)}</span></p>
          </div>
        </div>

        <p>Please supply the following items as per your quotation, at the prices below.</p>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-slate-300 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-2 w-8">#</th>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Unit price</th>
              <th className="py-2 pl-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, n) => (
              <tr key={l.request_item_id} className="border-b border-slate-100">
                <td className="py-2 pr-2 text-slate-500">{n + 1}</td>
                <td className="py-2 pr-2">{l.product?.name}</td>
                <td className="py-2 px-2 text-right tabular">{l.ordered} {l.product?.unit}</td>
                <td className="py-2 px-2 text-right tabular">{fmtINR(l.unit_price, { decimals: true })}</td>
                <td className="py-2 pl-2 text-right tabular">{fmtINR(l.total, { decimals: true })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 font-semibold">
              <td colSpan={4} className="py-2 text-right">Total</td>
              <td className="py-2 pl-2 text-right tabular">{fmtINR(wo.agreed_price, { decimals: true })}</td>
            </tr>
          </tfoot>
        </table>

        {wo.terms && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Terms</p>
            <p className="whitespace-pre-line">{wo.terms}</p>
          </div>
        )}

        <div className="text-slate-600 space-y-1">
          <p>Submit one invoice per delivery in the vendor portal, then add the dispatch details to get a gate pass for the driver.</p>
          <p>Payment is made for the quantity accepted after inspection, at the prices above.</p>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-10">
          <div />
          <div className="text-right">
            <div className="border-t border-slate-400 pt-1 inline-block min-w-[200px] text-center">
              <p className="font-semibold">{wo.creator?.name}</p>
              <p className="text-slate-500">Head of Department</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl mt-4 flex justify-end print:hidden">
        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
      </div>
    </div>
  );
}
