import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ScraperDetail from './pages/ScraperDetail';
import ScraperEdit from './pages/ScraperEdit';
import JobDetail from './pages/JobDetail';
import './App.css';

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Loading application...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <main>
            <Routes>
              <Route path="/login" element={<AuthPage type="login" />} />
              <Route path="/register" element={<AuthPage type="register" />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scrapers/:scraperId"
                element={
                  <ProtectedRoute>
                    <ScraperDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scrapers/:scraperId/edit"
                element={
                  <ProtectedRoute>
                    <ScraperEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs/:jobId"
                element={
                  <ProtectedRoute>
                    <JobDetail />
                  </ProtectedRoute>
                }
              />
              {/* Add a generic 404 page */}
              <Route path="*" element={<h1 style={{ textAlign: 'center', marginTop: '50px' }}>404 - Page Not Found</h1>} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;