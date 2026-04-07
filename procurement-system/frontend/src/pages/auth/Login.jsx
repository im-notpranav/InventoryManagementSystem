import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Bot } from 'lucide-react';
import useAuthStore from '../../store/auth.store';
import RobotAssistant from '../../components/RobotAssistant';
import { authApi } from '../../api/index.js';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Track mouse for robot eye movement
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);
    setMousePos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Determine robot mood
  const getRobotMood = () => {
    if (success) return 'happy';
    if (error) return 'confused';
    if (focusedField === 'password') return 'hiding';
    if (focusedField === 'email' || form.email) return 'typing';
    return 'idle';
  };

  // Robot look direction
  const getLookAt = () => {
    if (focusedField === 'email') return { x: 0.4, y: 0.6 };
    if (focusedField === 'password') return { x: 0, y: 0 };
    return mousePos;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authApi.login(form);

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      setSuccess(true);
      setTimeout(() => {
        setAuth(data.data.user, data.data.accessToken);
        // Redirect based on role
        const userRole = data.data.user?.role;
        if (userRole === 'Vendor') {
          navigate('/vendor-portal');
        } else {
          navigate('/dashboard');
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" ref={containerRef}>
      {/* Left Panel - Robot */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%)',
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], x: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #93c5fd 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i * 17) % 80}%`,
              }}
              animate={{
                y: [-20, 20, -20],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Robot */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <RobotAssistant
            mood={getRobotMood()}
            lookAt={getLookAt()}
            size={280}
          />
        </motion.div>

        {/* Branding text */}
        <motion.div
          className="relative z-10 text-center mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-400/30">
              <Bot className="w-6 h-6 text-blue-300" />
            </div>
            <span className="font-display text-2xl font-bold text-white">InventBot</span>
          </div>
          <p className="text-blue-200/70 text-sm max-w-xs">
            Your intelligent inventory management assistant powered by AI
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="relative z-10 flex gap-8 mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {[['Smart', 'AI Chatbot'], ['Real-time', 'Tracking'], ['Secure', 'RBAC']].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-blue-300 font-display text-lg font-bold">{val}</div>
              <div className="text-blue-400/50 text-xs mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-800">InventBot</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-slate-800 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to access your inventory dashboard</p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl px-4 py-3 text-sm mb-6"
              >
                ✅ Login successful! Redirecting...
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="admin@inventbot.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                id="login-email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-12"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : success ? '✅ Success!' : 'Sign in'}
            </motion.button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Demo credentials:{' '}
            <button
              type="button"
              onClick={() => setForm({ email: 'admin@inventbot.com', password: 'admin123' })}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              Admin
            </button>
            {' | '}
            <button
              type="button"
              onClick={() => setForm({ email: 'vendor1@test.com', password: 'vendor123' })}
              className="text-emerald-600 font-medium hover:text-emerald-700"
            >
              Vendor
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
