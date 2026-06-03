```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import MerchantDashboard from './pages/MerchantDashboard';
import CreatePaymentPage from './pages/CreatePaymentPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Spinner from './components/UI/Spinner'; // Example loading spinner
import './App.css'; // Global styles

// A wrapper for <Route> that redirects to the login screen if you're not yet authenticated.
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />; // Show a loading spinner while checking auth status
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.type)) {
    return <Navigate to="/unauthorized" replace />; // Redirect to unauthorized page
  }

  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Header />
          <main className="app-main-content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/" element={<PrivateRoute allowedRoles={['user', 'merchant', 'admin']}><Navigate to="/dashboard" replace /></PrivateRoute>} />

              <Route path="/dashboard" element={<PrivateRoute allowedRoles={['user', 'admin']}><UserDashboard /></PrivateRoute>} />
              <Route path="/merchant-dashboard" element={<PrivateRoute allowedRoles={['merchant', 'admin']}><MerchantDashboard /></PrivateRoute>} />

              <Route path="/pay/:merchantId?" element={<PrivateRoute allowedRoles={['user']}><CreatePaymentPage /></PrivateRoute>} />
              <Route path="/transactions/:id" element={<PrivateRoute allowedRoles={['user', 'merchant', 'admin']}><TransactionDetailPage /></PrivateRoute>} />
              <Route path="/payment-methods" element={<PrivateRoute allowedRoles={['user']}><PaymentMethodsPage /></PrivateRoute>} />

              <Route path="/settings" element={<PrivateRoute allowedRoles={['user', 'merchant', 'admin']}><SettingsPage /></PrivateRoute>} />

              <Route path="/unauthorized" element={<div><h1>403 - Unauthorized</h1><p>You do not have permission to access this page.</p></div>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
```