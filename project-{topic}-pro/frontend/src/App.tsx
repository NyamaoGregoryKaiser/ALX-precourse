```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Dashboard Pages
import DashboardList from './pages/Dashboards/DashboardList';
import DashboardDetail from './pages/Dashboards/DashboardDetail';
import DashboardForm from './pages/Dashboards/DashboardForm';

// Data Source Pages
import DataSourceList from './pages/DataSources/DataSourceList';
import DataSourceForm from './pages/DataSources/DataSourceForm';

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <Navbar />
                <main className="min-h-[calc(100vh-64px)] bg-gray-100 py-8">
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/" element={<Login />} /> {/* Default route */}
                        <Route path="/unauthorized" element={<div className="text-center p-8 text-red-600">You do not have permission to view this page.</div>} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                            {/* Dashboards */}
                            <Route path="/dashboards" element={<DashboardList />} />
                            <Route path="/dashboards/new" element={<DashboardForm />} />
                            <Route path="/dashboards/:id" element={<DashboardDetail />} />
                            <Route path="/dashboards/:id/edit" element={<DashboardForm />} />

                            {/* Data Sources */}
                            <Route path="/data-sources" element={<DataSourceList />} />
                            <Route path="/data-sources/new" element={<DataSourceForm />} />
                            <Route path="/data-sources/:id/edit" element={<DataSourceForm />} />
                        </Route>

                        {/* Fallback for unknown routes (optional) */}
                        <Route path="*" element={<div className="text-center p-8 text-gray-600">404 - Page Not Found</div>} />
                    </Routes>
                </main>
            </AuthProvider>
        </Router>
    );
};

export default App;
```