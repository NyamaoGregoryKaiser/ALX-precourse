```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import PrivateRoute from './components/auth/PrivateRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardListPage from './pages/DashboardListPage';
import DashboardViewPage from './pages/DashboardViewPage';
import DataSourceListPage from './pages/DataSourceListPage';
import ChartEditorPage from './pages/ChartEditorPage';
import NotFoundPage from './pages/NotFoundPage';
import HomePage from './pages/HomePage';
import { useAuth } from './context/AuthContext';
import { CssBaseline, Box } from '@mui/material';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <CssBaseline /> {/* Normalize CSS */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route path="/dashboards" element={<PrivateRoute><DashboardListPage /></PrivateRoute>} />
            <Route path="/dashboards/:id" element={<PrivateRoute><DashboardViewPage /></PrivateRoute>} />
            <Route path="/data-sources" element={<PrivateRoute><DataSourceListPage /></PrivateRoute>} />
            <Route path="/charts/new" element={<PrivateRoute><ChartEditorPage /></PrivateRoute>} />
            <Route path="/charts/edit/:id" element={<PrivateRoute><ChartEditorPage /></PrivateRoute>} />
            {/* Admin Routes can be added here with additional role checks */}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
    </Router>
  );
}

export default App;
```