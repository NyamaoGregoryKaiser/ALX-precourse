```typescript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import Navbar from './components/Navbar';
import styled from 'styled-components';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Content = styled.main`
  flex-grow: 1;
  padding: 20px;
  background-color: #f4f7f6;
`;

/**
 * PrivateRoute component to protect routes requiring authentication.
 * Redirects unauthenticated users to the login page.
 * @param children The component(s) to render if authenticated.
 */
const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>; // Or a spinner component
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * Main application component.
 * Sets up routing and uses AuthContext for authentication state.
 */
const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AppContainer>
      {isAuthenticated && <Navbar />} {/* Show Navbar only when logged in */}
      <Content>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage registerMode />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          {/* Redirect to dashboard if authenticated, else to login */}
          <Route
            path="*"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
          />
        </Routes>
      </Content>
    </AppContainer>
  );
};

export default App;
```