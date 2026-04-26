```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthGuard from './components/AuthGuard';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import ProjectsPage from './pages/Projects';
import ProjectDetailPage from './pages/ProjectDetail';
import TasksPage from './pages/Tasks';
import TaskDetailPage from './pages/TaskDetail';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <DashboardPage />
              </AuthGuard>
            }
          />
          <Route
            path="/projects"
            element={
              <AuthGuard>
                <ProjectsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <AuthGuard>
                <ProjectDetailPage />
              </AuthGuard>
            }
          />
          <Route
            path="/tasks"
            element={
              <AuthGuard>
                <TasksPage />
              </AuthGuard>
            }
          />
           <Route
            path="/tasks/:taskId"
            element={
              <AuthGuard>
                <TaskDetailPage />
              </AuthGuard>
            }
          />
          {/* Default route / redirect */}
          <Route path="/" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```