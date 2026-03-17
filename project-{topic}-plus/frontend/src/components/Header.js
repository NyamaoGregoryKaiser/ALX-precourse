```javascript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">Product Manager</Link>
        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              <span>Welcome, {user?.username} ({user?.role})</span>
              <Link to="/products">Products</Link>
              {user?.role === 'admin' && <Link to="/users">Users</Link>}
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
```