```javascript
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();

  if (loading) {
    return null; // Or a simple loading bar/spinner
  }

  return (
    <div className="layout-container">
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/">CMS Dashboard</Link>
        </div>
        <nav className="navbar-nav">
          {isAuthenticated ? (
            <>
              <span>Welcome, {user?.name} ({user?.role})</span>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/posts">Posts</Link>
              {/* Add more links based on user roles */}
              {user?.role === 'admin' && <Link to="/users">Users</Link>}
              <button onClick={logout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main className="content">
        <Outlet /> {/* Renders the child routes */}
      </main>
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} CMS Project. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
```