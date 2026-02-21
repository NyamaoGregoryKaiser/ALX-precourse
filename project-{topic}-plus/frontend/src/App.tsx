```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardListPage from './pages/DashboardListPage';
import DashboardViewPage from './pages/DashboardViewPage';
import ChartEditorPage from './pages/ChartEditorPage';
import DataSourceListPage from './pages/DataSourceListPage';
import CreateDataSourcePage from './pages/CreateDataSourcePage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/layout/Layout';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardListPage />} />
                <Route path="/dashboards" element={<DashboardListPage />} />
                <Route path="/dashboards/:id" element={<DashboardViewPage />} />
                <Route path="/charts/new" element={<ChartEditorPage />} />
                <Route path="/charts/edit/:id" element={<ChartEditorPage />} />
                <Route path="/data-sources" element={<DataSourceListPage />} />
                <Route path="/data-sources/new" element={<CreateDataSourcePage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Catch-all for 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
```