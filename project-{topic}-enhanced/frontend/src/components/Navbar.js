```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">SecureTask</Link>
      </div>
      <ul className="navbar-links">
        {isAuthenticated ? (
          <>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/projects">Projects</Link></li>
            {user?.role === 'ADMIN' && <li><Link to="/admin/users">Admin Panel</Link></li>}
            <li>
              <span>Welcome, {user?.name} ({user?.role})</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
```