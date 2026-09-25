import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const ROLE_HOMES = {
  Admin: '/dashboard',
  'Department User': '/dashboard',
  Vendor: '/vendor-portal',
  Watchman: '/gate-entry',
  Accountant: '/billing',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      let savedToken = localStorage.getItem('inventbot_token');
      let savedUser = localStorage.getItem('inventbot_user');
      if (!savedToken || !savedUser) {
        const legacyT = localStorage.getItem('token');
        const legacyU = localStorage.getItem('user');
        if (legacyT && legacyU) {
          localStorage.setItem('inventbot_token', legacyT);
          localStorage.setItem('inventbot_user', legacyU);
          savedToken = legacyT;
          savedUser = legacyU;
        }
      }
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('inventbot_token');
      localStorage.removeItem('inventbot_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    (userData, jwtToken) => {
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('inventbot_token', jwtToken);
      localStorage.setItem('inventbot_user', JSON.stringify(userData));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const home = ROLE_HOMES[userData?.role] || '/login';
      navigate(home, { replace: true });
    },
    [navigate]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('inventbot_token');
    localStorage.removeItem('inventbot_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'Admin',
    isDeptUser: user?.role === 'Department User',
    isVendor: user?.role === 'Vendor',
    isWatchman: user?.role === 'Watchman',
    isAccountant: user?.role === 'Accountant',
    user_id: user?.user_id ?? null,
    vendor_id: user?.vendor_id ?? null,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

export { ROLE_HOMES };
export default AuthContext;
