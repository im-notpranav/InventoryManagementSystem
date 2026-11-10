import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowRight, Lock, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth, ROLE_HOMES } from '../../context/AuthContext';
import { authApi } from '../../api/index.js';
import { MlritMark, FullScreenLoader } from '../../components/brand/Brand';
import ThemeToggle from '../../components/ThemeToggle';
import { useReducedMotion } from '../../hooks';
import { cn, errMsg } from '../../lib/utils';
import { prefetchPages } from '../../router';

// Demo accounts created by backend/prisma/seed.js (all use the demo password).
const DEMO_PASSWORD = 'demo1234';
const ROLE_OPTIONS = [
  { label: 'HOD · CSM(AIML)', email: 'hod.csm@mlrit.ac.in' },
  { label: 'Faculty · CSM(AIML)', email: 'faculty.csm@mlrit.ac.in' },
  { label: 'HOD · CSE', email: 'hod.cse@mlrit.ac.in' },
  { label: 'Faculty · CSE', email: 'faculty.cse@mlrit.ac.in' },
  { label: 'Super admin', email: 'admin@mlrit.ac.in' },
  { label: 'Vendor', email: 'vendor1@techsupply.com' },
  { label: 'Security', email: 'watchman@mlrit.ac.in' },
  { label: 'Accountant', email: 'accounts@mlrit.ac.in' },
].map((r) => ({ ...r, password: DEMO_PASSWORD }));

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const reduced = useReducedMotion();
  const from = useLocation().state?.from;
  const returnTo = from?.pathname && from.pathname !== '/' ? `${from.pathname}${from.search || ''}` : undefined;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const applyRole = (role) => {
    setSelectedRole(role.label);
    setForm({ email: role.email, password: role.password });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || success) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(form);
      const data = res.data || res;
      if (!data.success) throw new Error(data.message || 'Login failed');
      setSuccess(true);
      // Start loading the home page code while the success tick shows.
      prefetchPages(data.data.user?.role);
      setTimeout(() => login(data.data.user, data.data.token, returnTo), 250);
    } catch (err) {
      setError(errMsg(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <FullScreenLoader />;
  if (user) return <Navigate to={ROLE_HOMES[user.role] || '/dashboard'} replace />;

  const canSubmit = form.email && form.password && !loading && !success;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Campus photo */}
      {/* WebP (90-230 KB) instead of the 450 KB JPEG; the JPEG stays as fallback. */}
      <picture>
        <source type="image/webp" srcSet="/brand/campus-960.webp 960w, /brand/campus.webp 1672w" sizes="100vw" />
        <img src="/brand/campus.jpg" alt="" aria-hidden fetchpriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover object-[center_40%]" />
      </picture>
      {/* Darken only the left side, where the logo text sits; keep the building clear. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(8_10_12/0.72)_0%,rgb(8_10_12/0.45)_35%,rgb(8_10_12/0.12)_65%,rgb(8_10_12/0.2)_100%)]" />

      <ThemeToggle className="absolute top-5 right-5 z-20 !bg-surface/90" />

      <div className="relative z-10 min-h-screen mx-auto max-w-[1280px] grid lg:grid-cols-[1fr_440px] items-center gap-10 px-5 sm:px-10 py-10">
        {/* Floating logo + institute name */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            animate={reduced ? undefined : { y: [0, -12, 0] }}
            transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
            className="relative"
          >
            <div className="w-28 h-28 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-white grid place-items-center shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
              <MlritMark className="w-[72%] h-[72%]" title="MLRIT logo" />
            </div>
          </motion.div>
          <motion.div
            aria-hidden
            animate={reduced ? undefined : { scaleX: [1, 0.82, 1], opacity: [0.45, 0.28, 0.45] }}
            transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
            className="mt-4 w-24 sm:w-32 lg:w-40 h-3 rounded-[50%] bg-black/60 blur-md lg:ml-4"
          />

          <h1 className="mt-6 font-wordmark font-black uppercase text-mlrit-orange leading-[1.05] tracking-[0.01em] text-[26px] sm:text-4xl lg:text-[44px] [text-shadow:0_2px_18px_rgb(0_0_0/0.35)]">
            MLR Institute
            <br className="hidden sm:block" /> of Technology
          </h1>
          <p className="mt-3 font-wordmark font-extrabold text-white/85 text-base sm:text-lg">Raising Engineers</p>
          <p className="mt-6 hidden lg:block text-sm text-white/65 max-w-sm">Procurement and inventory portal for departments, vendors, security and accounts.</p>
        </div>

        {/* Sign-in card */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px] mx-auto rounded-3xl bg-surface border border-slate-200 shadow-pop p-6 sm:p-8"
        >
          <h2 className="text-[26px] font-bold text-slate-900 leading-tight">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Use your college email and password.</p>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Demo accounts</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => applyRole(role)}
                  className={cn('chip', selectedRole === role.label ? 'chip-active' : 'chip-idle')}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
            {success && (
              <motion.div key="ok" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                <div role="status" className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Signed in. Opening your dashboard…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@mlrit.ac.in"
                  className="ui-input !pl-10 !py-3"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-700">Password</label>
                <button type="button" className="text-xs text-brand-600 hover:text-brand-700 font-medium" onClick={() => setError('Ask your administrator to reset your password.')}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Password"
                  className="ui-input !pl-10 !pr-12 !py-3"
                />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors',
                canSubmit ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed',
              )}
            >
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {success && <CheckCircle2 className="w-5 h-5" />}
              <span>{loading ? 'Signing in…' : success ? 'Signed in' : 'Sign in'}</span>
              {!loading && !success && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">MLR Institute of Technology, Dundigal, Hyderabad</p>
        </motion.div>
      </div>
    </div>
  );
}
