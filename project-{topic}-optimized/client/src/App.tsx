import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import ModelsPage from './pages/ModelsPage';
import ExperimentsPage from './pages/ExperimentsPage';
import PreprocessingPage from './pages/PreprocessingPage';
import { Box, Spinner, Flex } from '@chakra-ui/react';
import Navbar from './components/Navbar';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Flex height="100vh" align="center" justify="center">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Navbar />
      <Box pt="60px"> {/* Adjust padding top for fixed navbar */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/datasets" element={<ProtectedRoute><DatasetsPage /></ProtectedRoute>} />
          <Route path="/models" element={<ProtectedRoute><ModelsPage /></ProtectedRoute>} />
          <Route path="/experiments" element={<ProtectedRoute><ExperimentsPage /></ProtectedRoute>} />
          <Route path="/preprocessing" element={<ProtectedRoute><PreprocessingPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for unknown routes */}
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
```