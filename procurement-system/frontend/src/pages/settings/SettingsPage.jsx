import { useState } from 'react';
import { KeyRound, Mail, User, Shield, Building2, CheckCircle2, Info, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/index.js';
import { PageHeader, Card, Button, Field, Input, PasswordInput, Badge, Avatar, KV, useToast } from '../../components/ui';
import { errMsg } from '../../lib/utils';

const strengthOf = (p) => [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [em, setEm] = useState({ email: '', password: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [savingEm, setSavingEm] = useState(false);

  const strength = strengthOf(pw.next);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error('New password must be at least 8 characters');
    if (pw.next !== pw.confirm) return toast.error('Passwords do not match');
    setSavingPw(true);
    try {
      await usersApi.changeMyPassword(pw.current, pw.next);
      toast.success('Password updated. Please sign in again with the new password.');
      setPw({ current: '', next: '', confirm: '' });
      setTimeout(logout, 1500);
    } catch (err) {
      toast.error(errMsg(err, 'Could not change password'));
    } finally {
      setSavingPw(false);
    }
  };

  const changeEmail = async (e) => {
    e.preventDefault();
    setSavingEm(true);
    try {
      await usersApi.changeMyEmail(em.password, em.email);
      toast.success('Email updated. Please sign in again with the new email.');
      setEm({ email: '', password: '' });
      setTimeout(logout, 1500);
    } catch (err) {
      toast.error(errMsg(err, 'Could not change email'));
    } finally {
      setSavingEm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Account settings" subtitle="Your profile and sign-in credentials." icon={User} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" padded>
          <div className="flex flex-col items-center text-center">
            <Avatar name={user?.name} size="xl" solid ring />
            <h2 className="font-display text-lg font-semibold text-slate-900 mt-3">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <Badge tone="brand" className="mt-2">{user?.role}</Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <KV label="User ID" value={`#${user?.user_id ?? '—'}`} mono />
            <KV label="Department" value={user?.department || '—'} />
            <KV label="Role" value={user?.role} />
            {user?.vendor_id && <KV label="Vendor ID" value={`#${user.vendor_id}`} mono />}
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 flex gap-2">
            <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <span>Name, role and department are managed by an administrator. Contact them for changes.</span>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Change password" icon={KeyRound} description="You'll be signed out after changing it.">
            <form onSubmit={changePassword} className="space-y-4 max-w-md">
              <Field label="Current password" required><PasswordInput required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
              <Field label="New password" required hint="At least 8 characters — mix upper case, numbers and symbols.">
                <PasswordInput required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
                {pw.next && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 rounded-full ${i <= strength ? ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'][strength] : 'bg-slate-200'}`} />)}</div>
                    <span className="text-[11px] text-slate-500 w-12 text-right">{['', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</span>
                  </div>
                )}
              </Field>
              <Field label="Confirm new password" required error={pw.confirm && pw.confirm !== pw.next ? 'Passwords do not match' : undefined}><PasswordInput required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></Field>
              <Button type="submit" loading={savingPw} icon={CheckCircle2}>Update password</Button>
            </form>
          </Card>

          <Card title="Change email" icon={Mail} description="Your email is also your sign-in username.">
            <form onSubmit={changeEmail} className="space-y-4 max-w-md">
              <Field label="New email address" required><Input type="email" required value={em.email} onChange={(e) => setEm({ ...em, email: e.target.value })} placeholder="you@college.edu" leftIcon={Mail} /></Field>
              <Field label="Current password" required hint="Required to confirm this change"><PasswordInput required value={em.password} onChange={(e) => setEm({ ...em, password: e.target.value })} autoComplete="current-password" /></Field>
              <Button type="submit" variant="secondary" loading={savingEm} icon={CheckCircle2}>Update email</Button>
            </form>
          </Card>

          <Card title="Security" icon={Shield} description="How your session is protected">
            <ul className="grid sm:grid-cols-3 gap-3 text-sm">
              {[
                { icon: KeyRound, t: 'JWT sessions', d: 'Tokens expire automatically; sign in again when prompted.' },
                { icon: Building2, t: 'Role-based access', d: 'You only see screens your role is allowed to use.' },
                { icon: Monitor, t: 'Audit trail', d: 'Sign-ins and sensitive writes are logged.' },
              ].map((x) => (
                <li key={x.t} className="rounded-xl border border-slate-200 p-3.5">
                  <x.icon className="w-4 h-4 text-brand-600" />
                  <p className="font-medium text-slate-800 mt-2">{x.t}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{x.d}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
