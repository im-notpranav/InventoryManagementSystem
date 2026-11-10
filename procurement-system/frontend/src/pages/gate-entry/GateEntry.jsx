// Gate verification. The driver shows the gate pass: scanning its QR with the phone
// camera opens this page with ?code=XXXXXX, or the watchman types the 6-digit code.
// The watchman compares vehicle + package count + items, then taps Match or Mismatch.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DoorOpen, ShieldCheck, ShieldAlert, Truck, Package, Hash, History, Search as SearchIcon, X } from 'lucide-react';
import api from '../../api/axios';
import { ErrorNote, DeptBadge } from '../../components/order/OrderParts';
import { PageHeader, DataTable, Button, Field, Input, Textarea, FileDrop, StatusBadge, KV, Tabs, useToast } from '../../components/ui';
import { fmtDate, fmtDateTime, dataOf, errMsg, cn } from '../../lib/utils';

const clean = (v) => String(v || '').replace(/\D/g, '').slice(0, 6);

export default function GateEntry() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(clean(params.get('code')));
  const [found, setFound] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);
  const [tab, setTab] = useState('expected');
  const [expected, setExpected] = useState([]);
  const [history, setHistory] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const inputRef = useRef(null);

  const loadLists = async () => {
    setListsLoading(true);
    const [e, h] = await Promise.allSettled([api.get('/gate-entry/expected'), api.get('/gate-entry/history')]);
    setExpected(e.status === 'fulfilled' ? dataOf(e.value) : []);
    setHistory(h.status === 'fulfilled' ? dataOf(h.value) : []);
    setListsLoading(false);
  };

  const lookup = async (value = code) => {
    const c = clean(value);
    setLookupError('');
    setFound(null);
    if (c.length !== 6) return setLookupError('Enter the 6-digit code from the gate pass.');
    setLooking(true);
    try {
      setFound(dataOf(await api.get(`/gate-entry/lookup/${c}`), null));
    } catch (e) {
      setLookupError(errMsg(e, 'No delivery is expected with this code'));
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    loadLists();
    if (clean(params.get('code')).length === 6) lookup(params.get('code'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setFound(null);
    setCode('');
    setLookupError('');
    if (params.get('code')) setParams((p) => { p.delete('code'); return p; }, { replace: true });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const done = (msg, ok) => {
    toast[ok ? 'success' : 'warning'](msg, { title: ok ? 'Entry allowed' : 'Entry blocked' });
    reset();
    loadLists();
  };

  const expectedCols = [
    { key: 'shipment_number', header: 'Delivery', render: (s) => <span className="font-mono text-[12.5px] font-semibold text-slate-800">{s.shipment_number}</span> },
    { key: 'vendor_name', header: 'Vendor', render: (s) => <span className="text-slate-700">{s.vendor_name}</span> },
    { key: 'department', header: 'For', hideBelow: 'lg', render: (s) => <DeptBadge department={s.department} /> },
    { key: 'vehicle_number', header: 'Vehicle', render: (s) => <span className="font-mono text-xs">{s.vehicle_number}</span> },
    { key: 'num_packages', header: 'Packages', align: 'right', hideBelow: 'md', render: (s) => <span className="tabular">{s.num_packages}</span> },
    { key: 'expected_arrival', header: 'Expected', hideBelow: 'md', sortValue: (s) => new Date(s.expected_arrival || 0).getTime(), render: (s) => <span className="text-xs text-slate-600">{fmtDate(s.expected_arrival)}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ];

  const historyCols = [
    { key: 'checked_at', header: 'When', sortValue: (c) => new Date(c.checked_at).getTime(), render: (c) => <span className="text-xs text-slate-600">{fmtDateTime(c.checked_at)}</span> },
    { key: 'shipment', header: 'Delivery', render: (c) => <span className="font-mono text-xs text-slate-800">{c.shipment?.shipment_number}</span> },
    { key: 'vendor', header: 'Vendor', hideBelow: 'md', render: (c) => <span className="text-slate-700">{c.shipment?.wo?.vendor?.vendor_name}</span> },
    { key: 'vehicle', header: 'Vehicle', hideBelow: 'lg', render: (c) => <span className="font-mono text-xs">{c.shipment?.vehicle_number}</span> },
    { key: 'result', header: 'Result', render: (c) => <StatusBadge status={c.result} /> },
    { key: 'reason', header: 'Note', hideBelow: 'lg', render: (c) => <span className="text-xs text-slate-500">{c.reason || '—'}</span> },
    { key: 'by', header: 'By', hideBelow: 'lg', render: (c) => <span className="text-xs text-slate-500">{c.checker?.name}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Verification"
        subtitle="Scan the QR on the driver's gate pass with your phone camera, or type the 6-digit code."
        icon={DoorOpen}
      />

      <div className="surface p-4 sm:p-5 max-w-2xl">
        {!found ? (
          <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="space-y-3">
            <Field label="Gate code">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    ref={inputRef}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(clean(e.target.value))}
                    placeholder="000000"
                    leftIcon={Hash}
                    mono
                    className="text-lg tracking-[0.35em]"
                  />
                </div>
                <Button type="submit" icon={SearchIcon} loading={looking} disabled={code.length !== 6}>Find</Button>
              </div>
            </Field>
            <ErrorNote>{lookupError}</ErrorNote>
          </form>
        ) : (
          <CheckPanel shipment={found} onCancel={reset} onDone={done} />
        )}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'expected', label: `On the way (${expected.length})` }, { key: 'history', label: 'Recent checks' }]} />

      {tab === 'expected' ? (
        <DataTable
          key="expected"
          columns={expectedCols}
          rows={expected}
          rowKey="shipment_id"
          loading={listsLoading}
          emptyIcon={Truck}
          emptyTitle="No deliveries on the way"
          emptyDescription="Dispatched deliveries appear here. The code is only on the driver's pass."
        />
      ) : (
        <DataTable
          key="history"
          columns={historyCols}
          rows={history}
          rowKey="check_id"
          loading={listsLoading}
          emptyIcon={History}
          emptyTitle="No gate checks yet"
        />
      )}
    </div>
  );
}

function CheckPanel({ shipment: s, onCancel, onDone }) {
  const [mode, setMode] = useState(null); // null | 'mismatch'
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const blocked = s.status === 'gate_blocked';

  const send = async (result) => {
    setError('');
    if (result === 'mismatch' && !reason.trim()) return setError('Say what did not match.');
    const fd = new FormData();
    fd.append('result', result);
    if (reason.trim()) fd.append('reason', reason.trim());
    if (photo) fd.append('photo', photo);
    setBusy(result);
    try {
      const res = await api.post(`/gate-entry/${s.shipment_id}/check`, fd);
      onDone(res.data?.message || (result === 'match' ? 'Goods sent for review' : 'HOD notified'), result === 'match');
    } catch (e) {
      setError(errMsg(e, 'Could not save the check'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-900">{s.shipment_number}</p>
          <p className="text-xs text-slate-500">{s.vendor_name} · invoice {s.invoice_number}</p>
          {s.department && <p className="text-xs text-slate-600 mt-1">Deliver to <DeptBadge department={s.department} /></p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={s.status} />
          <Button size="icon" variant="ghost" icon={X} onClick={onCancel} aria-label="Close" />
        </div>
      </div>

      <p className="text-sm text-slate-600">Check these against the vehicle:</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <KV label="Vehicle number" value={<span className="text-lg">{s.vehicle_number}</span>} mono />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <KV label="Packages" value={<span className="text-lg">{s.num_packages}</span>} />
        </div>
      </div>
      <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100">
        {s.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3 px-3.5 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-slate-800"><Package className="w-3.5 h-3.5 text-slate-400" />{i.name}</span>
            <span className="tabular text-slate-900">{i.qty} <span className="text-xs text-slate-400">{i.unit}</span></span>
          </li>
        ))}
      </ul>

      {s.last_check && (
        <p className={cn('text-xs', s.last_check.result === 'match' ? 'text-emerald-700' : 'text-red-700')}>
          Last check: {s.last_check.result === 'match' ? 'matched' : `mismatch — ${s.last_check.reason}`} · {fmtDateTime(s.last_check.at)}{s.last_check.by ? ` · ${s.last_check.by}` : ''}
        </p>
      )}

      <ErrorNote>{error}</ErrorNote>

      {blocked ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          This delivery was blocked. Do not let it in until the HOD allows a retry.
        </div>
      ) : mode === 'mismatch' ? (
        <div className="space-y-3">
          <Field label="What did not match?" required>
            <Textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 3 boxes instead of 5, different vehicle" />
          </Field>
          <Field label="Photo" hint="Optional">
            <FileDrop file={photo} onChange={setPhoto} accept="image/*" label="Take or attach a photo" compact />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMode(null)}>Back</Button>
            <Button variant="danger" icon={ShieldAlert} loading={busy === 'mismatch'} onClick={() => send('mismatch')} className="flex-1">Block entry</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="danger" size="lg" icon={ShieldAlert} onClick={() => setMode('mismatch')}>Mismatch</Button>
          <Button variant="success" size="lg" icon={ShieldCheck} loading={busy === 'match'} onClick={() => send('match')}>Match: let in</Button>
        </div>
      )}
    </div>
  );
}
