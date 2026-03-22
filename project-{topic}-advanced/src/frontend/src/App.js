```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ManageProductsPage from './pages/admin/ManageProductsPage';
import UsersPage from './pages/admin/UsersPage'; // Not implemented in backend, but good for structure

function PrivateRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!user || user.role !== requiredRole)) {
    return <Navigate to="/" replace state={{ message: "You don't have permission to view this page." }} />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/products" element={
            <PrivateRoute>
              <ProductsPage />
            </PrivateRoute>
          } />
          <Route path="/products/:id" element={
            <PrivateRoute>
              <ProductDetailPage />
            </PrivateRoute>
          } />
          <Route path="/admin/products" element={
            <PrivateRoute requiredRole="admin">
              <ManageProductsPage />
            </PrivateRoute>
          } />
          <Route path="/admin/users" element={
            <PrivateRoute requiredRole="admin">
              <UsersPage />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Fallback route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```