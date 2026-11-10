// Add / edit / renew dialogs for the warranty & subscription tracker.
import { useEffect, useState } from 'react';
import { Shield, Repeat, RefreshCw } from 'lucide-react';
import { warrantiesApi, subscriptionsApi } from '../../api/index.js';
import { Button, Modal, Field, Input, Select, Textarea, Switch, Segmented, FileDrop, useToast } from '../../components/ui';
import { ErrorNote } from '../../components/order/OrderParts';
import { DEPARTMENTS } from '../../lib/departments';
import { errMsg, fmtDate } from '../../lib/utils';

export const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' },
];
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const CYCLE_UNIT = { monthly: 'month', quarterly: 'quarter', yearly: 'year', one_time: 'purchase' };

// Common licences, so the usual ones are one tap away.
const SUGGESTIONS = [
  ['Microsoft 365', 'Microsoft'],
  ['Adobe Photoshop', 'Adobe'],
  ['Adobe Creative Cloud', 'Adobe'],
  ['Claude Team', 'Anthropic'],
  ['ChatGPT Team', 'OpenAI'],
  ['GitHub Copilot', 'GitHub'],
  ['Google Workspace', 'Google'],
  ['MATLAB', 'MathWorks'],
  ['AutoCAD', 'Autodesk'],
  ['Zoom Workplace', 'Zoom'],
  ['Quick Heal Antivirus', 'Quick Heal'],
];

/** "YYYY-MM-DD" in local time, for <input type="date">. */
export const toInput = (d) => (d ? new Date(d).toLocaleDateString('en-CA') : '');

export function addMonths(dateStr, months) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return toInput(d);
}

// Plain JSON unless a file is attached; then multipart so the file reaches multer.
function payload(fields, file) {
  if (!file) return fields;
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, typeof v === 'boolean' ? String(v) : v));
  fd.append('document', file);
  return fd;
}

function DepartmentField({ value, onChange, show }) {
  if (!show) return null;
  return (
    <Field label="Department" required hint="Its HOD gets the reminders, along with the super admin.">
      <Select required value={value} onChange={onChange} placeholder="Select department…">
        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
      </Select>
    </Field>
  );
}

function QuickDates({ from, onPick, options }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {options.map(([label, months]) => (
        <button key={label} type="button" onClick={() => onPick(addMonths(from, months))} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition">
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Warranty add / edit ──────────────────────────────────────
const EMPTY_W = { product_id: '', vendor_id: '', serial_number: '', quantity: '1', start_date: '', end_date: '', notes: '', department: '' };

export function WarrantyForm({ open, onClose, onSaved, record, products, vendors, pickDepartment }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_W);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  useEffect(() => {
    if (!open) return;
    setError('');
    setFile(null);
    setForm(record
      ? {
          product_id: String(record.product_id), vendor_id: record.vendor_id ? String(record.vendor_id) : '',
          serial_number: record.serial_number || '', quantity: String(record.quantity || 1),
          start_date: toInput(record.start_date), end_date: toInput(record.end_date), notes: record.notes || '', department: record.department,
        }
      : { ...EMPTY_W, start_date: toInput(new Date()) });
  }, [open, record]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.end_date && form.start_date && form.end_date < form.start_date) return setError('The end date must be after the start date.');
    setSaving(true);
    try {
      const fields = { ...form, department: pickDepartment ? form.department : undefined };
      const res = record ? await warrantiesApi.update(record.warranty_id, payload(fields, file)) : await warrantiesApi.create(payload(fields, file));
      toast.success(res.data?.message || 'Saved');
      onSaved(res.data?.data);
    } catch (err) {
      setError(errMsg(err, 'Could not save the warranty'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} icon={Shield} title={record ? 'Edit warranty' : 'Add warranty'}
      description="Coverage for purchased equipment. Reminders go out 30, 7 and 1 day before it ends."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="warranty-form" loading={saving}>{record ? 'Save changes' : 'Add warranty'}</Button></>}>
      <form id="warranty-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <DepartmentField show={pickDepartment} value={form.department} onChange={set('department')} />
        <Field label="Product" required>
          <Select required value={form.product_id} onChange={set('product_id')} placeholder="Select product…">
            {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Serial number" className="col-span-2"><Input value={form.serial_number} onChange={set('serial_number')} placeholder="Optional" mono /></Field>
          <Field label="Units"><Input type="number" min="1" value={form.quantity} onChange={set('quantity')} /></Field>
        </div>
        <Field label="Vendor" hint="Who to call for a claim. Optional.">
          <Select value={form.vendor_id} onChange={set('vendor_id')} placeholder="Not recorded">
            {vendors.map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date" required><Input type="date" required value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="End date" required>
            <Input type="date" required min={form.start_date || undefined} value={form.end_date} onChange={set('end_date')} />
            <QuickDates from={form.start_date} onPick={set('end_date')} options={[['1 yr', 12], ['2 yr', 24], ['3 yr', 36], ['5 yr', 60]]} />
          </Field>
        </div>
        <Field label="Warranty card / invoice" hint="PDF or image, optional">
          <FileDrop compact file={file} onChange={setFile} accept=".pdf,.jpg,.jpeg,.png" />
        </Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="e.g. Onsite support, claim number, lab location" /></Field>
      </form>
    </Modal>
  );
}

// ── Subscription add / edit ──────────────────────────────────
const EMPTY_S = { service_name: '', provider: '', plan: '', seats: '', cost: '', billing_cycle: 'yearly', start_date: '', expiry_date: '', auto_renew: false, notes: '', department: '' };

export function SubscriptionForm({ open, onClose, onSaved, record, pickDepartment }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_S);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  useEffect(() => {
    if (!open) return;
    setError('');
    setFile(null);
    setForm(record
      ? {
          service_name: record.service_name, provider: record.provider || '', plan: record.plan || '',
          seats: record.seats ?? '', cost: record.cost ?? '', billing_cycle: record.billing_cycle || 'yearly',
          start_date: toInput(record.start_date), expiry_date: toInput(record.expiry_date), auto_renew: !!record.auto_renew,
          notes: record.notes || '', department: record.department,
        }
      : { ...EMPTY_S, start_date: toInput(new Date()) });
  }, [open, record]);

  const pickSuggestion = (name, provider) => setForm((f) => ({ ...f, service_name: name, provider: f.provider || provider }));
  const months = CYCLE_MONTHS[form.billing_cycle];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.start_date && form.expiry_date && form.expiry_date < form.start_date) return setError('The renewal date must be after the start date.');
    setSaving(true);
    try {
      const fields = {
        ...form,
        auto_renew: form.billing_cycle === 'one_time' ? false : form.auto_renew,
        department: pickDepartment ? form.department : undefined,
      };
      const res = record ? await subscriptionsApi.update(record.subscription_id, payload(fields, file)) : await subscriptionsApi.create(payload(fields, file));
      toast.success(res.data?.message || 'Saved');
      onSaved(res.data?.data);
    } catch (err) {
      setError(errMsg(err, 'Could not save the subscription'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={Repeat} title={record ? 'Edit subscription' : 'Add subscription'}
      description="Software licence or recurring service. Reminders go out 30, 7 and 1 day before renewal."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="sub-form" loading={saving}>{record ? 'Save changes' : 'Add subscription'}</Button></>}>
      <form id="sub-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <DepartmentField show={pickDepartment} value={form.department} onChange={set('department')} />
        <Field label="Service" required>
          <Input required autoFocus={!record} value={form.service_name} onChange={set('service_name')} placeholder="e.g. Microsoft 365, Adobe Photoshop, Claude" list="sub-suggestions" />
          <datalist id="sub-suggestions">{SUGGESTIONS.map(([n]) => <option key={n} value={n} />)}</datalist>
          {!record && !form.service_name && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTIONS.slice(0, 6).map(([n, p]) => (
                <button key={n} type="button" onClick={() => pickSuggestion(n, p)} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition">{n}</button>
              ))}
            </div>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Provider"><Input value={form.provider} onChange={set('provider')} placeholder="e.g. Microsoft" /></Field>
          <Field label="Plan / edition"><Input value={form.plan} onChange={set('plan')} placeholder="e.g. A3, Team, Pro" /></Field>
        </div>
        <Field label="Billing cycle">
          <Segmented value={form.billing_cycle} onChange={set('billing_cycle')} options={CYCLES} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Cost per ${CYCLE_UNIT[form.billing_cycle]} (₹)`}>
            <Input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} placeholder="Optional" />
          </Field>
          <Field label="Seats / licences"><Input type="number" min="1" value={form.seats} onChange={set('seats')} placeholder="Optional" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date"><Input type="date" value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label={form.billing_cycle === 'one_time' ? 'Valid until' : 'Next renewal'} required>
            <Input type="date" required min={form.start_date || undefined} value={form.expiry_date} onChange={set('expiry_date')} />
            {months && <QuickDates from={form.start_date} onPick={set('expiry_date')} options={[[`+1 ${CYCLE_UNIT[form.billing_cycle]}`, months]]} />}
          </Field>
        </div>
        {form.billing_cycle !== 'one_time' && (
          <Switch checked={form.auto_renew} onChange={set('auto_renew')} label="Auto-renews (card or mandate on file)" />
        )}
        <Field label="Invoice / licence document" hint="PDF or image, optional">
          <FileDrop compact file={file} onChange={setFile} accept=".pdf,.jpg,.jpeg,.png" />
        </Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Admin account, licence key location, who uses it…" /></Field>
      </form>
    </Modal>
  );
}

// ── Renew / extend ───────────────────────────────────────────
export function RenewDialog({ open, onClose, onSaved, kind, record }) {
  const toast = useToast();
  const isSub = kind === 'subscription';
  const current = record ? (isSub ? record.expiry_date : record.end_date) : null;
  const [date, setDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // A lapsed item renewed late starts its new cycle today.
  const base = current && new Date(current) < new Date() ? toInput(new Date()) : toInput(current);

  useEffect(() => {
    if (!open || !record) return;
    setError('');
    setNotes('');
    setCost(isSub && record.cost != null ? String(record.cost) : '');
    const months = isSub ? CYCLE_MONTHS[record.billing_cycle] : 12;
    setDate(months ? addMonths(base, months) : '');
  }, [open, record]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!record) return null;
  const name = isSub ? record.service_name : record.product?.name;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { [isSub ? 'expiry_date' : 'end_date']: date, notes: notes || undefined, ...(isSub ? { cost } : {}) };
      const res = isSub ? await subscriptionsApi.renew(record.subscription_id, body) : await warrantiesApi.renew(record.warranty_id, body);
      toast.success(res.data?.message || 'Renewed', { title: name });
      onSaved(res.data?.data);
    } catch (err) {
      setError(errMsg(err, 'Could not record the renewal'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} icon={RefreshCw} title={isSub ? `Renew ${name}` : `Extend warranty: ${name}`}
      description={`Currently ${isSub ? 'renews' : 'ends'} on ${fmtDate(current)}. Reminders restart for the new date.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="renew-form" variant="success" loading={saving} icon={RefreshCw}>{isSub ? 'Record renewal' : 'Extend'}</Button></>}>
      <form id="renew-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label={isSub ? 'Next renewal date' : 'New end date'} required>
          <Input type="date" required value={date} min={toInput(current)} onChange={(e) => setDate(e.target.value)} />
          <QuickDates from={base} onPick={setDate} options={isSub ? [['+1 month', 1], ['+3 months', 3], ['+1 year', 12]] : [['+1 yr', 12], ['+2 yr', 24], ['+3 yr', 36]]} />
        </Field>
        {isSub && <Field label="Cost for this cycle (₹)" hint="Change it if the price went up or down"><Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>}
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isSub ? 'e.g. Invoice no., paid by college card' : 'e.g. AMC bought from vendor, ref no.'} /></Field>
      </form>
    </Modal>
  );
}
