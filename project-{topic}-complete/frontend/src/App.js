```javascript
import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import { AuthContext } from './context/AuthContext'; // Import AuthContext

// A simple PrivateRoute component
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { authState } = useContext(AuthContext);

  if (!authState.isAuthenticated) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(authState.user.role)) {
    // Logged in but not authorized for this role, redirect to home or unauthorized page
    return <Navigate to="/" replace />; // Or a dedicated unauthorized page
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <Header />
      <main className="container mt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route path="/cart" element={
            <PrivateRoute>
              <CartPage />
            </PrivateRoute>
          } />
          <Route path="/checkout" element={
            <PrivateRoute>
              <CheckoutPage />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } />
          <Route path="/orders" element={
            <PrivateRoute>
              <OrderHistoryPage />
            </PrivateRoute>
          } />

          {/* Admin Routes Example */}
          <Route path="/admin/dashboard" element={
            <PrivateRoute allowedRoles={['admin']}>
              <div>Admin Dashboard (Placeholder)</div>
            </PrivateRoute>
          } />
          {/* ... other admin routes ... */}

          <Route path="*" element={<h2>404 Not Found</h2>} /> {/* Catch-all for undefined routes */}
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
```