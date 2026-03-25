import { Routes, Route, Navigate } from 'react-router-dom';
import { Flex, Spinner } from '@chakra-ui/react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import Header from './components/Header';

/**
 * `App` component is the main routing component of the application.
 * It uses `react-router-dom` for navigation and `useAuth` hook to
 * protect routes that require authentication.
 */
function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show a loading spinner while authentication status is being determined
  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  return (
    <Flex direction="column" minH="100vh">
      {isAuthenticated && <Header />} {/* Show header only when authenticated */}
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/projects/:projectId"
          element={isAuthenticated ? <ProjectDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          }
        />
        {/* Fallback for unmatched routes */}
        <Route
          path="*"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
        />
      </Routes>
    </Flex>
  );
}

export default App;