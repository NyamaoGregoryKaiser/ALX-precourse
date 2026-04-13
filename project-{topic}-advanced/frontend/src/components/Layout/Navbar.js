import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={isAuthenticated ? "/dashboard" : "/"}>Web Scraper</Link>
      </div>
      <ul className="navbar-nav">
        {isAuthenticated ? (
          <>
            <li><Link to="/dashboard">Dashboard</Link></li>
            {user && user.role === 'ADMIN' && <li><Link to="/admin">Admin</Link></li>}
            <li>
              <span>Welcome, {user?.username}</span>
            </li>
            <li>
              <button onClick={handleLogout} className="navbar-button">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/">Login / Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;