import { Navigate } from 'react-router-dom';
import { useAuth, ROLE_HOMES } from '../context/AuthContext';
import { PageSkeleton } from './ui';

/** Gate a single page element by role(s). */
export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
  return children;
}
