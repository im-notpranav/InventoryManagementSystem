import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Bot, ArrowRight, ShieldCheck, Lock, Mail, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth, ROLE_HOMES } from '../../context/AuthContext';
import RobotAssistant from '../../components/RobotAssistant';
import { authApi } from '../../api/index.js';
import Aurora from '../../components/reactbits/Aurora/Aurora';
import BlurText from '../../components/reactbits/BlurText/BlurText';
import RotatingText from '../../components/reactbits/RotatingText/RotatingText';
import ShinyText from '../../components/reactbits/ShinyText/ShinyText';
import CountUp from '../../components/reactbits/CountUp/CountUp';
import Magnet from '../../components/reactbits/Magnet/Magnet';
import GradientText from '../../components/reactbits/GradientText/GradientText';
import Noise from '../../components/reactbits/Noise/Noise';
import { useReducedMotion, useMediaQuery } from '../../hooks';
import { cn, errMsg } from '../../lib/utils';

const ROLE_OPTIONS = [
  { label: 'Admin', email: 'admin@college.edu', password: 'admin123', blurb: 'Full control' },
  { label: 'Department', email: 'itdept@college.edu', password: 'dept123', blurb: 'Raise requests' },
  { label: 'Vendor', email: 'vendor1@test.com', password: 'vendor123', blurb: 'Quote & deliver' },
  { label: 'Security', email: 'watchman@college.edu', password: 'watch123', blurb: 'Gate entry' },
  { label: 'Accountant', email: 'accountant@college.edu', password: 'acc123', blurb: 'Release bills' },
];

const TICKER = [
  { dot: 'bg-emerald-400', text: 'PR-2026-IT-0042 approved by Admin' },
  { dot: 'bg-amber-400', text: 'WO-2026-ADM-0017 dispatched by vendor' },
  { dot: 'bg-sky-400', text: '3 warranties expiring this month' },
  { dot: 'bg-emerald-400', text: 'Goods received at gate — GE-2026-0089' },
  { dot: 'bg-amber-400', text: 'PR-2026-HR-0011 pending review' },
  { dot: 'bg-sky-400', text: 'Low stock alert: Office Chairs' },
  { dot: 'bg-emerald-400', text: 'Bill released for PO-2026-TCS-0002' },
];

const STATS = [
  { to: 24, label: 'Active orders' },
  { to: 36, label: 'Vendors' },
  { to: 98, label: 'Match accuracy', suffix: '%' },
];

const strengthOf = (pwd) => {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};
const STRENGTH = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const reduced = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);
  const containerRef = useRef(null);

  const strength = strengthOf(form.password);

  // Mascot eye tracking
  const onMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 4;
    const cy = rect.top + rect.height / 3;
    const x = (e.clientX - cx) / (rect.width / 2);
    const y = (e.clientY - cy) / (rect.height / 2);
    setMouse({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }, []);

  useEffect(() => {
    if (!isDesktop) return undefined;
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [onMove, isDesktop]);

  useEffect(() => {
    const t = setInterval(() => setTick((i) => (i + 3) % TICKER.length), 3400);
    return () => clearInterval(t);
  }, []);

  const tickerRows = useMemo(() => [0, 1, 2].map((i) => TICKER[(tick + i) % TICKER.length]), [tick]);

  const mood = success ? 'happy' : error ? 'confused' : loading ? 'loading' : focused === 'password' ? (showPass ? 'peeking' : 'hiding') : focused === 'email' || form.email ? 'typing' : 'idle';
  const lookAt = focused === 'email' ? { x: 0.4, y: 0.6 } : focused === 'password' ? { x: 0, y: 0 } : mouse;

  const bubble = loading
    ? 'Verifying your credentials…'
    : success
      ? 'Welcome back! Taking you in now 🎉'
      : error
        ? "Hmm, those details don't look right…"
        : strength === 4 && form.password
          ? 'Strong password — nice 💪'
          : mood === 'hiding'
            ? "I'll look away 🙈"
            : mood === 'peeking'
              ? 'Oh! Peeking at the password? 👀'
              : focused === 'email'
                ? 'Type the email you registered with.'
                : "Hi, I'm InventBot. Ready when you are.";

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
      setTimeout(() => login(data.data.user, data.data.token), 1000);
    } catch (err) {
      setError(errMsg(err, 'Invalid email or password.'));
      setTimeout(() => setError(''), 4500);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700" />
      </div>
    );
  }
  if (user) return <Navigate to={ROLE_HOMES[user.role] || '/dashboard'} replace />;

  const canSubmit = form.email && form.password && !loading && !success;

  return (
    <div className="min-h-screen flex bg-white" ref={containerRef}>
      {/* ───────────── LEFT: brand panel ───────────── */}
      <div className="hidden lg:flex w-[52%] xl:w-1/2 relative overflow-hidden flex-col text-white" style={{ background: 'linear-gradient(160deg, #070b16 0%, #0f172a 45%, #1e3a5f 100%)' }}>
        {/* Aurora (WebGL) — skipped for reduced motion */}
        {!reduced && (
          <div className="absolute inset-0 opacity-90">
            <Aurora colorStops={['#3b82f6', '#93c5fd', '#2e75b6']} amplitude={1.4} blend={0.7} speed={0.8} />
          </div>
        )}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <Noise patternSize={200} patternAlpha={18} patternRefreshInterval={4} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1324] via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
          {/* brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl grid place-items-center bg-white/10 border border-white/15 backdrop-blur">
              <Bot className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <GradientText colors={['#ffffff', '#93c5fd', '#ffffff']} animationSpeed={6} className="!mx-0 !cursor-default font-display text-2xl font-bold">
                InventBot
              </GradientText>
              <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200/50 -mt-0.5">Procurement · Inventory · AI</p>
            </div>
          </div>

          {/* mascot */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative flex flex-col items-center pt-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key={bubble}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.22 }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-2xl bg-white text-brand-700 text-sm font-medium px-4 py-2.5 max-w-xs text-center shadow-pop"
                >
                  {bubble}
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
                </motion.div>
              </AnimatePresence>
              <motion.div animate={loading && !reduced ? { y: [0, -8, 0] } : { y: 0 }} transition={loading ? { repeat: Infinity, duration: 0.55 } : {}}>
                <RobotAssistant mood={mood} lookAt={lookAt} size={250} />
              </motion.div>
            </div>

            <div className="mt-4 text-center max-w-md">
              <BlurText
                text="Procurement that runs itself."
                delay={90}
                animateBy="words"
                direction="bottom"
                stepDuration={0.4}
                className="justify-center font-display text-[34px] xl:text-[40px] font-bold leading-[1.1] text-white"
              />
              <div className="mt-3 flex items-center justify-center gap-2 text-blue-100/80 text-base">
                <span>Built to</span>
                <RotatingText
                  texts={['request', 'quote', 'verify', 'deliver', 'pay']}
                  mainClassName="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10 text-white font-semibold overflow-hidden"
                  staggerFrom="last"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '-120%' }}
                  staggerDuration={0.015}
                  splitLevelClassName="overflow-hidden pb-0.5"
                  transition={{ type: 'spring', damping: 32, stiffness: 520 }}
                  rotationInterval={2600}
                />
                <span>with an audit trail.</span>
              </div>
            </div>
          </div>

          {/* ticker + stats */}
          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <ShinyText text="Live activity" speed={3} color="#93c5fd" shineColor="#ffffff" className="text-[10px] uppercase tracking-[0.16em] font-semibold" />
              </div>
              <div className="space-y-1.5 min-h-[66px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {tickerRows.map((row) => (
                    <motion.div
                      key={row.text}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-2 text-[12.5px] text-blue-50/85"
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', row.dot)} />
                      <span className="truncate">{row.text}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-6 pb-1">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-2xl font-bold text-blue-100 tabular">
                    <CountUp to={s.to} duration={1.4} />
                    {s.suffix}
                  </div>
                  <div className="text-[11px] text-blue-200/50 mt-0.5 whitespace-nowrap">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────── RIGHT: form ───────────── */}
      <div className="flex-1 relative flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(800px 400px at 100% 0%, rgba(46,117,182,0.07), transparent 60%)' }} />
        <motion.div
          className="relative w-full max-w-[440px]"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* mobile brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-brand-700 to-brand-500 shadow-card">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-slate-900 leading-none">InventBot</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mt-1">Procurement · Inventory</p>
            </div>
          </div>

          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure sign in
            </p>
            <h1 className="font-display text-[30px] font-bold text-slate-900 leading-tight">Welcome back</h1>
            <p className="text-slate-500 mt-1.5">Sign in to your InventBot workspace.</p>
          </div>

          {/* Quick role picker */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Demo access</p>
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" /> fills credentials</span>
            </div>
            {/* Five chips never fit a phone; scroll them as a row there, grid on ≥sm. */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5 snap-x sm:grid sm:grid-cols-5 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
              {ROLE_OPTIONS.map((role) => {
                const active = selectedRole === role.label;
                return (
                  <motion.button
                    key={role.label}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => applyRole(role)}
                    className={cn(
                      'relative rounded-xl border px-1.5 py-2 text-center transition-[border-color,background-color,color,box-shadow] duration-200 shrink-0 snap-start min-w-[96px] sm:min-w-0',
                      active ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-glow' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span className="block text-[11.5px] font-semibold leading-tight truncate">{role.label}</span>
                    <span className={cn('block text-[9.5px] leading-tight mt-0.5 truncate', active ? 'text-brand-600' : 'text-slate-400')}>{role.blurb}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
            {success && (
              <motion.div key="ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Signed in. Redirecting to your workspace…</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors', focused === 'email' ? 'text-brand-600' : 'text-slate-400')} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@college.edu"
                  className="ui-input !pl-10 !py-3 !bg-slate-50"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-700">Password</label>
                <button type="button" className="text-xs text-brand-600 hover:text-brand-800 font-medium" onClick={() => setError('Ask your administrator to reset your password.')}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors', focused === 'password' ? 'text-brand-600' : 'text-slate-400')} />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className="ui-input !pl-10 !pr-12 !py-3 !bg-slate-50"
                />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition" aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {form.password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <motion.span key={i} className={cn('h-1 rounded-full', i <= strength ? STRENGTH_COLOR[strength] : 'bg-slate-200')} layout />
                        ))}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 w-12 text-right">{STRENGTH[strength]}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none group">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-brand-600 cursor-pointer" />
              <span className="text-sm text-slate-600 group-hover:text-slate-800">Keep me signed in on this device</span>
            </label>

            <Magnet padding={40} magnetStrength={14} disabled={!canSubmit || reduced} wrapperClassName="block" innerClassName="block">
              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.985 } : undefined}
                className={cn(
                  'group relative w-full h-12 rounded-xl font-semibold text-[15px] text-white flex items-center justify-center gap-2 overflow-hidden transition-all duration-300',
                  canSubmit ? 'bg-brand-700 hover:bg-brand-600 shadow-[0_10px_30px_-10px_rgba(30,58,95,0.6)]' : 'bg-slate-300 cursor-not-allowed',
                )}
              >
                {canSubmit && !reduced && (
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                )}
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : null}
                <span>{loading ? 'Signing in…' : success ? 'Success' : 'Sign in'}</span>
                {!loading && !success && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
              </motion.button>
            </Magnet>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Protected by JWT auth &amp; role-based access. Sessions are audit-logged.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
