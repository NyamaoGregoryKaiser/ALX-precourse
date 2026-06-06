import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DataSourcesPage from './pages/DataSourcesPage';
import ChartEditorPage from './pages/ChartEditorPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ChartProvider } from './contexts/ChartContext'; // New context for chart data/state
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/App.css'; // Global styles

// PrivateRoute component to protect routes
const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a spinner
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <ChartProvider>
            <Layout>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/dashboards/:id" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/data-sources" element={<PrivateRoute><DataSourcesPage /></PrivateRoute>} />
                <Route path="/charts/new" element={<PrivateRoute><ChartEditorPage /></PrivateRoute>} />
                <Route path="/charts/:id/edit" element={<PrivateRoute><ChartEditorPage /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" />} /> {/* Catch-all for unknown routes */}
              </Routes>
            </Layout>
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
          </ChartProvider>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;