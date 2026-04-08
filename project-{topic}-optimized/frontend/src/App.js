import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';
import HomePage from './pages/HomePage';

import './App.css'; // Basic styling for the app

function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />; // Or to an unauthorized page
  }

  return children;
}

function App() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="App">
      <nav className="navbar">
        <Link to="/" className="nav-brand">MyApp</Link>
        <div className="nav-links">
          <Link to="/products" className="nav-item">Products</Link>
          {isAuthenticated ? (
            <>
              <span className="nav-item">Welcome, {user?.username} ({user?.role})</span>
              {user?.role === 'admin' && (
                 <Link to="/products/new" className="nav-item">Add Product</Link>
              )}
              {user?.role === 'user' && (
                 <Link to="/products/new" className="nav-item">Add Product</Link>
              )}
              <button type="button" onClick={logout} className="nav-item nav-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-item">Login</Link>
              <Link to="/register" className="nav-item">Register</Link>
            </>
          )}
        </div>
      </nav>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />

          <Route
            path="/products/new"
            element={
              <PrivateRoute allowedRoles={['user', 'admin']}>
                <ProductFormPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/products/edit/:id"
            element={
              <PrivateRoute allowedRoles={['user', 'admin']}>
                <ProductFormPage />
              </PrivateRoute>
            }
          />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
```