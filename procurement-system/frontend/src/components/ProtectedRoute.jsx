import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOMES } from '../context/AuthContext';
import { FullScreenLoader } from './brand/Brand';

/**
 * If `allowedRoles` is empty: require authentication only (use with `Outlet` or `children`).
 * If `allowedRoles` is set: require auth + one of the roles; otherwise redirect to that user's home.
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader label="Loading your workspace" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
  }
  return children || <Outlet />;
}
