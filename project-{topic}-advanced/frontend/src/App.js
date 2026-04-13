import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Layout/Navbar';
import './App.css'; // Global app styling

function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Optionally show an unauthorized message or redirect to a /403 page
    return <Navigate to="/dashboard" replace />; // Redirect unauthorized users to dashboard
  }

  return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute roles={['USER', 'ADMIN']}>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          {/* Add more private routes here, e.g., /admin, /settings */}
          <Route path="*" element={<h1>404: Page Not Found</h1>} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;