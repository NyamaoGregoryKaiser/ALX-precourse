import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';
import HomePage from '@/pages/Home';
import DashboardPage from '@/pages/Dashboard';
import ProfilePage from '@/pages/Profile';
import AdminUsersPage from '@/pages/AdminUsers';
import ProductsPage from '@/pages/Products';
import NotFoundPage from '@/pages/NotFound';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import Loader from './components/Loader';

function App() {
  const { isAuthenticated, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/products" element={<ProductsPage />} />
          </Route>

          {/* Admin-only Routes */}
          <Route element={<ProtectedRoute requiredPermissions={['user:read', 'admin:access']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;