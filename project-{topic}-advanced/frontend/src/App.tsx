import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardsPage from './pages/DashboardsPage';
import DashboardDetailPage from './pages/DashboardDetailPage';
import DataSourcesPage from './pages/DataSourcesPage';
import CreateDataSourcePage from './pages/CreateDataSourcePage';
import UserProfilePage from './pages/UserProfilePage';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import styled from 'styled-components';

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const ContentWrapper = styled.div`
  flex-grow: 1;
  padding: 1rem;
  padding-top: calc(var(--header-height) + 1rem); /* Account for fixed navbar */
  margin-left: ${(props: { sidebarOpen: boolean }) => props.sidebarOpen ? '250px' : '0'};
  transition: margin-left 0.3s ease-in-out;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // Consider managing sidebar state globally if needed

  return (
    <>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <AppContainer>
        {isAuthenticated && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <ContentWrapper sidebarOpen={isAuthenticated && sidebarOpen}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<PrivateRoute><DashboardsPage /></PrivateRoute>} />
            <Route path="/dashboards" element={<PrivateRoute><DashboardsPage /></PrivateRoute>} />
            <Route path="/dashboards/:id" element={<PrivateRoute><DashboardDetailPage /></PrivateRoute>} />
            <Route path="/data-sources" element={<PrivateRoute><DataSourcesPage /></PrivateRoute>} />
            <Route path="/data-sources/new" element={<PrivateRoute><CreateDataSourcePage /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />

            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboards" : "/login"} />} />
          </Routes>
        </ContentWrapper>
      </AppContainer>
    </>
  );
}

export default App;