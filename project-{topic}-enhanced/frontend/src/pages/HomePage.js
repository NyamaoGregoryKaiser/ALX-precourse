```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="homepage-container">
      <h1 className="homepage-title">Welcome to SecureTask</h1>
      <p className="homepage-description">Your enterprise-grade solution for secure task management.</p>
      {isAuthenticated ? (
        <div className="auth-status">
          <p>You are logged in as {user.name} ({user.role}).</p>
          <Link to="/dashboard" className="homepage-button">Go to Dashboard</Link>
        </div>
      ) : (
        <div className="auth-actions">
          <Link to="/login" className="homepage-button primary">Login</Link>
          <Link to="/register" className="homepage-button secondary">Register</Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;
```