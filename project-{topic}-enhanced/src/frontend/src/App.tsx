import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import { api } from './api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.defaults.headers.common['Authorization'] = '';
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <nav style={{ padding: '10px', background: '#f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Link to="/" style={{ margin: '0 10px' }}>Home</Link>
          {isAuthenticated && <Link to="/projects" style={{ margin: '0 10px' }}>Projects</Link>}
        </div>
        <div>
          {!isAuthenticated ? (
            <>
              <Link to="/login" style={{ margin: '0 10px' }}>Login</Link>
              <Link to="/register" style={{ margin: '0 10px' }}>Register</Link>
            </>
          ) : (
            <>
              <span>Hello, {JSON.parse(localStorage.getItem('user') || '{}').username || 'User'}</span>
              <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
            </>
          )}
        </div>
      </nav>
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/projects" /> : <LoginForm onSuccess={handleAuthSuccess} />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/projects" /> : <RegisterForm onSuccess={handleAuthSuccess} />} />
          <Route path="/projects" element={isAuthenticated ? <ProjectPage /> : <Navigate to="/login" />} />
          <Route path="/projects/:id" element={isAuthenticated ? <ProjectPage /> : <Navigate to="/login" />} /> {/* For project detail later */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;