```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DataSourcesPage from './pages/DataSourcesPage';
import DatasetsPage from './pages/DatasetsPage';
import VisualizationsPage from './pages/VisualizationsPage';
import DashboardBuilderPage from './pages/DashboardBuilderPage';
import VisualizationEditorPage from './pages/VisualizationEditorPage';
import DashboardsPage from './pages/DashboardsPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import { Spin } from 'antd';

// PrivateRoute component to protect routes
const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes - Rendered within DashboardLayout */}
          <Route path="/app/*" element={
            <PrivateRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="data-sources" element={<DataSourcesPage />} />
                  <Route path="datasets" element={<DatasetsPage />} />
                  <Route path="visualizations" element={<VisualizationsPage />} />
                  <Route path="visualizations/new" element={<VisualizationEditorPage />} />
                  <Route path="visualizations/edit/:id" element={<VisualizationEditorPage />} />
                  <Route path="dashboards" element={<DashboardsPage />} />
                  <Route path="dashboards/new" element={<DashboardBuilderPage />} />
                  <Route path="dashboards/edit/:id" element={<DashboardBuilderPage />} />
                  <Route path="dashboards/view/:id" element={<DashboardBuilderPage viewMode={true} />} />
                  <Route path="*" element={<NotFoundPage />} /> {/* Nested 404 */}
                </Routes>
              </DashboardLayout>
            </PrivateRoute>
          } />

          {/* Catch all other unknown routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
```