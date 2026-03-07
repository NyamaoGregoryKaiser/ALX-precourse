```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout Components
import Navbar from './components/Navbar';

// Page Components
import HomePage from './pages/Dashboard'; // Default home for authenticated users
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ServiceList from './pages/ServiceList';
import ServiceDetail from './pages/ServiceDetail';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} /> {/* Home for authenticated users */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services" element={<ServiceList />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/services/:id/metrics" element={<ServiceDetail />} /> {/* Alias for viewing metrics */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
```