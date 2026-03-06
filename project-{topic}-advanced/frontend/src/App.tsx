```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from '@components/Navbar';
import ProtectedRoute from '@components/ProtectedRoute';
import ErrorBoundary from '@components/ErrorBoundary';

import HomePage from '@pages/Home';
import LoginPage from '@pages/Login';
import RegisterPage from '@pages/Register';
import DashboardPage from '@pages/Dashboard';
import ProfilePage from '@pages/Profile';
import NotFoundPage from '@pages/NotFound';
import ForgotPasswordPage from '@pages/ForgotPassword';
import ResetPasswordPage from '@pages/ResetPassword';
import VerifyEmailPage from '@pages/VerifyEmail';
import ResendVerificationPage from '@pages/ResendVerification';
import AdminUsersPage from '@pages/AdminUsers'; // Admin-specific page

import { UserRole } from '../../backend/src/entities/Role'; // Direct import from backend for enum

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Navbar />
          <main style={{ flexGrow: 1, padding: '20px 0' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/resend-verification" element={<ResendVerificationPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* Admin Specific Route */}
                <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
```