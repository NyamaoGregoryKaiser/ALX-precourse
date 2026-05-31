```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const Navbar = () => {
  const { isAuthenticated, user, logout, hasRole } = useAuth();

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold hover:text-blue-200 transition duration-300">
          ALX CMS
        </Link>
        <div className="space-x-4">
          <Link to="/" className="text-white hover:text-blue-200 transition duration-300">Home</Link>
          {isAuthenticated ? (
            <>
              {hasRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]) && (
                <Link to="/dashboard" className="text-white hover:text-blue-200 transition duration-300">Dashboard</Link>
              )}
              {hasRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]) && (
                <Link to="/posts/new" className="text-white hover:text-blue-200 transition duration-300">Create Post</Link>
              )}
              <span className="text-white text-opacity-80">Hello, {user?.username} ({user?.role})</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300">Login</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
```