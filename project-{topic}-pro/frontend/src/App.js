import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import MLTaskFormPage from './pages/MLTaskFormPage';
import NotFoundPage from './pages/NotFoundPage';
import AppLayout from './components/AppLayout';

// A private route component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><AppLayout><ProjectsPage /></AppLayout></PrivateRoute>} />
          <Route path="/projects/:projectId" element={<PrivateRoute><AppLayout><ProjectDetailsPage /></AppLayout></PrivateRoute>} />
          <Route path="/projects/:projectId/new-ml-task" element={<PrivateRoute><AppLayout><MLTaskFormPage /></AppLayout></PrivateRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;