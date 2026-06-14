```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import DatasetDetailsPage from './pages/DatasetDetailsPage';
import ModelsPage from './pages/ModelsPage';
import ModelDetailsPage from './pages/ModelDetailsPage';
import UtilityPlaygroundPage from './pages/UtilityPlaygroundPage';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />; // Or a 403 Forbidden page
  }

  return children;
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Header />}
        <div className="content-area">
          {isAuthenticated && <Sidebar />}
          <main className="main-content">
            <Routes>
              <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <HomePage />} />
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
                path="/datasets"
                element={
                  <ProtectedRoute>
                    <DatasetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/datasets/:id"
                element={
                  <ProtectedRoute>
                    <DatasetDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/models"
                element={
                  <ProtectedRoute>
                    <ModelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/models/:id"
                element={
                  <ProtectedRoute>
                    <ModelDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/utilities"
                element={
                  <ProtectedRoute>
                    <UtilityPlaygroundPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
```

---

### 2. Database Layer (PostgreSQL with Sequelize)