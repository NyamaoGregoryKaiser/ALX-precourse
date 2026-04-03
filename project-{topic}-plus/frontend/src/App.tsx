```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import { useAppSelector } from './app/hooks';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ScrapingJobsPage from './pages/ScrapingJobsPage';
import ScrapingJobDetailsPage from './pages/ScrapingJobDetailsPage';
import CreateScrapingJobPage from './pages/CreateScrapingJobPage';

// ProtectedRoute component
interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useAppSelector((state) => state.auth);
  if (!token) {
    // Redirect to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Box display="flex" flexDirection="column" minHeight="100vh">
        <Header />
        <Box as="main" flex="1" p={4}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <ScrapingJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/create"
              element={
                <ProtectedRoute>
                  <CreateScrapingJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <ScrapingJobDetailsPage />
                </ProtectedRoute>
              }
            />
            {/* Add more protected routes as needed */}
            <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all */}
          </Routes>
        </Box>
        <Footer />
      </Box>
    </Router>
  );
}

export default App;
```