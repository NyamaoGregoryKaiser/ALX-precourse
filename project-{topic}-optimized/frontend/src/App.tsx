```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { Container, Box } from '@chakra-ui/react';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Container maxW="container.xl" p={0} h="100vh" display="flex" flexDirection="column">
      <Box flex="1" overflow="hidden">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} /> {/* Redirect any unknown route */}
        </Routes>
      </Box>
    </Container>
  );
}

export default App;
```