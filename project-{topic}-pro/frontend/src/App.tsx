import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import api from './services/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InitiatePaymentPage from './pages/InitiatePaymentPage';
import PaymentsListPage from './pages/PaymentsListPage';
import { UserRole } from '../../backend/src/entities/User'; // Assuming shared types

interface AuthContextType {
  user: { id: string; email: string; role: UserRole } | null;
  token: string | null;
  login: (token: string, user: { id: string; email: string; role: UserRole }) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; role: UserRole } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('alxpay_token'));

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // In a real app, you'd verify the token with /auth/me
      const fetchUser = async () => {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          logout();
        }
      };
      fetchUser();
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (newToken: string, newUser: { id: string; email: string; role: UserRole }) => {
    localStorage.setItem('alxpay_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('alxpay_token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isMerchant = user?.role === UserRole.MERCHANT;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isAdmin, isMerchant }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (roles && user && !roles.includes(user.role)) {
      navigate('/dashboard'); // Or an unauthorized page
    }
  }, [isAuthenticated, user, roles, navigate]);

  if (!isAuthenticated || (roles && user && !roles.includes(user.role))) {
    return null; // Or a loading spinner / unauthorized message
  }

  return <>{children}</>;
};


const App: React.FC = () => {
  const { isAuthenticated, logout, isMerchant, isAdmin } = useAuth();
  return (
    <div className="App">
      <nav style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Home</Link>
        {!isAuthenticated ? (
          <>
            <Link to="/login" style={{ marginRight: '15px' }}>Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" style={{ marginRight: '15px' }}>Dashboard</Link>
            {isMerchant && <Link to="/payments/initiate" style={{ marginRight: '15px' }}>Initiate Payment</Link>}
            {isMerchant && <Link to={`/payments/merchant/${useAuth().user?.id}`} style={{ marginRight: '15px' }}>My Payments</Link>}
            <button onClick={logout} style={{ marginLeft: '15px' }}>Logout</button>
          </>
        )}
      </nav>
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/initiate"
            element={
              <ProtectedRoute roles={[UserRole.MERCHANT, UserRole.ADMIN]}>
                <InitiatePaymentPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/payments/merchant/:merchantId"
            element={
              <ProtectedRoute roles={[UserRole.MERCHANT, UserRole.ADMIN]}>
                <PaymentsListPage />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes */}
        </Routes>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  return (
    <div>
      <h1>Welcome to ALXPay!</h1>
      {isAuthenticated ? (
        <p>Hello, {user?.email} ({user?.role})! Go to your <Link to="/dashboard">Dashboard</Link>.</p>
      ) : (
        <p>Please <Link to="/login">login</Link> or <Link to="/register">register</Link> to get started.</p>
      )}
    </div>
  );
};

const AppWrapper: React.FC = () => (
  <Router>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Router>
);

export default AppWrapper;
```