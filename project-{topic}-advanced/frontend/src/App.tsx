```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout'; // A common layout for authenticated routes
import UserProfilePage from './pages/UserProfilePage';
import ProjectDetailsPage from './pages/ProjectDetailsPage'; // For viewing specific project tasks

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes - require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout><DashboardPage /></Layout>} />
            <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
            <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
            <Route path="/projects/:id" element={<Layout><ProjectDetailsPage /></Layout>} /> {/* View tasks for a specific project */}
            <Route path="/tasks" element={<Layout><TasksPage /></Layout>} />
            <Route path="/profile" element={<Layout><UserProfilePage /></Layout>} />
            {/* Add other protected routes here */}
            {/* Example: Admin-only routes could be nested further with an authorization check */}
            {/* <Route path="/admin" element={<AdminRoute />}>
              <Route path="users" element={<Layout><AdminUsersPage /></Layout>} />
            </Route> */}
          </Route>

          {/* Catch-all for 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```