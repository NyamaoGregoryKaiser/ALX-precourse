import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TaskDetailPage from './pages/TaskDetailPage';
import WorkspacesPage from './pages/WorkspacesPage';
import { useAuth } from './hooks/useAuth';
import Header from './components/common/Header';
import { Box, Spinner, Flex } from '@chakra-ui/react';

// PrivateRoute component to protect routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Header /> {/* Header will be shown on all pages */}
      <Box pt="60px"> {/* Adjust padding based on header height */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/workspaces" element={<PrivateRoute><WorkspacesPage /></PrivateRoute>} />
          <Route path="/projects/:projectId" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
          <Route path="/tasks/:taskId" element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} />
          {/* Add a catch-all for 404 if needed */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Router>
  );
};

export default App;