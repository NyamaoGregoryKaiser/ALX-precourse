```javascript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold hover:text-gray-300 transition-colors">
          Product Catalog
        </Link>
        <div className="flex space-x-4">
          <Link to="/products" className="text-gray-300 hover:text-white transition-colors">Products</Link>
          {isAuthenticated ? (
            <>
              {user && user.role === 'admin' && (
                <Link to="/admin/products" className="text-gray-300 hover:text-white transition-colors">Manage Products</Link>
              )}
              {/* Optional: <Link to="/admin/users" className="text-gray-300 hover:text-white transition-colors">Manage Users</Link> */}
              <span className="text-gray-400">Welcome, {user?.email} ({user?.role})</span>
              <button onClick={handleLogout} className="text-red-300 hover:text-red-500 transition-colors focus:outline-none">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="text-gray-300 hover:text-white transition-colors">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
```