```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PostListPage from './pages/PostListPage';
import PostEditorPage from './pages/PostEditorPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner'; // Simple loading component

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />; // Show a loading spinner while auth state is being determined
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // Redirect unauthorized users
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Posts routes */}
        <Route path="posts" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'author']}><PostListPage /></ProtectedRoute>} />
        <Route path="posts/new" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'author']}><PostEditorPage /></ProtectedRoute>} />
        <Route path="posts/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'author']}><PostEditorPage /></ProtectedRoute>} />
        {/*
        <Route path="pages" element={<ProtectedRoute allowedRoles={['admin', 'editor']}><PageListPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
        <Route path="media" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'author']}><MediaLibraryPage /></ProtectedRoute>} />
        */}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
```