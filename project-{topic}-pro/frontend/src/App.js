```javascript
import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TaskDetailPage from './pages/TaskDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute'; // For admin-specific routes
import ManageUsersPage from './pages/ManageUsersPage';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex h-screen bg-gray-100">
      {user && <Sidebar />}
      <div className="flex flex-col flex-1">
        {user && <Header />}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
            <Route path="/projects/:projectId" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
            <Route path="/tasks/:taskId" element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} /> {/* Direct task link */}

            {/* Admin specific routes */}
            <Route path="/admin/users" element={<AdminRoute><ManageUsersPage /></AdminRoute>} />
            {/* ... other admin routes */}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
```