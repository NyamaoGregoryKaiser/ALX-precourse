```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import ProductForm from './pages/ProductForm';
import UserList from './pages/UserList';
import Unauthorized from './pages/Unauthorized';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header />
          <main className="content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Publicly accessible product list and detail */}
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/:id" element={<ProductDetail />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                {/* Any authenticated user can create/edit their own product */}
                <Route path="/products/new" element={<ProductForm />} />
                <Route path="/products/edit/:id" element={<ProductForm />} />
              </Route>

              {/* Admin-only routes */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/users" element={<UserList />} />
                {/* Additional admin-only product actions would go here if not handled by generic product routes */}
              </Route>
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
```