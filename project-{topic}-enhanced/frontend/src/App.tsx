import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Main Application Pages
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/Project/ProjectList';
import ProjectDetail from './pages/Project/ProjectDetail';
import AssignedTasks from './pages/Task/AssignedTasks';
import TaskDetail from './pages/Task/TaskDetail';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import { UserRole } from './types';

// Utility/Error Pages
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import Profile from './pages/Profile'; // Simple profile page

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Project Routes */}
            <Route path="/projects" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/projects/:projectId/tasks/:taskId" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />

            {/* Task Routes */}
            <Route path="/tasks/assigned" element={<ProtectedRoute><AssignedTasks /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><AdminDashboard /></ProtectedRoute>} />

            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      </AuthProvider>
    </Router>
  );
};

export default App;
```

#### `frontend/src/pages/Profile.tsx`
```typescript