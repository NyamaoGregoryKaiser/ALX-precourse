```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthPage } from './pages/Auth';
import { DashboardPage } from './pages/Dashboard';
import { DbConnectionsPage } from './pages/DbConnections';
import { RecommendationListPage } from './pages/RecommendationList';
import { RecommendationDetailPage } from './pages/RecommendationDetail';
import { SettingsPage } from './pages/Settings';
import { NotFoundPage } from './pages/NotFound';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Layout } from './components/layout/Layout';
import { Toaster } from 'react-hot-toast'; // For notifications

function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" reverseOrder={false} />
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="db-connections" element={<DbConnectionsPage />} />
                    <Route path="recommendations" element={<RecommendationListPage />} />
                    <Route path="recommendations/:id" element={<RecommendationDetailPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
```