// Public page opened from the RFQ invite email. A vendor who is not registered yet
// sets a name, company and password, and lands straight in the vendor portal.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, AlertCircle, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { MlritMark } from '../../components/brand/Brand';
import { Field, Input, PasswordInput, Button } from '../../components/ui';
import { dataOf, errMsg } from '../../lib/utils';

export default function VendorInvite() {
  const { token } = useParams();
  const { login } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ name: '', company_name: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/auth/vendor-invite/${token}`)
      .then((r) => {
        const d = dataOf(r, null);
        setInvite(d);
        setForm((f) => ({ ...f, company_name: d?.vendor_name && d.vendor_name !== d.email ? d.vendor_name : '' }));
      })
      .catch((e) => setLoadError(errMsg(e, 'This invite link is invalid or has expired.')));
  }, [token]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.company_name.trim()) return setError('Enter your name and company name.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      const d = dataOf(await api.post(`/auth/vendor-invite/${token}`, form), null);
      login(d.user, d.token);
    } catch (err) {
      setError(errMsg(err, 'Could not set up your account'));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md surface p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white grid place-items-center border border-slate-200 shrink-0">
            <MlritMark className="w-[72%] h-[72%]" title="MLRIT logo" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Supplier invite</p>
            <h1 className="text-lg font-bold text-slate-900">Quote on a purchase request</h1>
          </div>
        </div>

        {loadError ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {loadError}
            </div>
            <p className="text-sm text-slate-600">Already set up your account? <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link></p>
          </div>
        ) : !invite ? (
          <div className="space-y-3"><div className="skeleton h-10" /><div className="skeleton h-10" /><div className="skeleton h-10" /></div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-slate-600">
              <Store className="inline w-4 h-4 mr-1 text-slate-400" />
              Invited as <span className="font-medium text-slate-900">{invite.email}</span>
              {invite.open_rfqs ? ` · ${invite.open_rfqs} RFQ${invite.open_rfqs > 1 ? 's' : ''} waiting` : ''}
            </p>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
            <Field label="Company name" required><Input value={form.company_name} onChange={set('company_name')} autoFocus /></Field>
            <Field label="Your name" required><Input value={form.name} onChange={set('name')} /></Field>
            <Field label="Phone" hint="Optional"><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Choose a password" required hint="At least 8 characters. Use it with your email to log in later.">
              <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" />
            </Field>
            <Button type="submit" loading={saving} className="w-full">Open vendor portal <ArrowRight className="w-4 h-4" /></Button>
          </form>
        )}
      </div>
    </div>
  );
}
