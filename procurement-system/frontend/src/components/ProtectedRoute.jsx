import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOMES } from '../context/AuthContext';
import { Bot } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 grid place-items-center text-white shadow-card">
          <Bot className="w-7 h-7" />
        </div>
        <span className="absolute -inset-2 rounded-3xl border-2 border-brand-300/50 animate-ping" />
      </div>
      <p className="text-sm text-slate-500">Loading your workspace…</p>
    </div>
  );
}

/**
 * If `allowedRoles` is empty: require authentication only (use with `Outlet` or `children`).
 * If `allowedRoles` is set: require auth + one of the roles; otherwise redirect to that user's home.
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
  }
  return children || <Outlet />;
}
