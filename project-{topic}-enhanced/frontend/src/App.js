```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Placeholder pages for other modules
const ProjectsPage = () => <h2>Projects List (Protected)</h2>;
const ProjectDetailPage = () => <h2>Project Detail (Protected)</h2>;
const AdminUsersPage = () => <h2>Admin: Manage Users (Admin Only)</h2>;

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} /> {/* Example protected route */}
            <Route path="/projects/:id" element={<ProjectDetailPage />} /> {/* Example protected route */}
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          {/* Fallback for unknown routes */}
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```