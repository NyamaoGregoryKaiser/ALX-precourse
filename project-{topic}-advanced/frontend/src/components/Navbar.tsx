```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          PerfMonitor
        </Link>
        <ul className="flex space-x-4 items-center">
          {!loading && isAuthenticated && (
            <>
              <li>
                <Link to="/dashboard" className="hover:text-gray-300">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-gray-300">
                  Services
                </Link>
              </li>
              <li className="text-gray-400">Hello, {user?.username}!</li>
              <li>
                <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded">
                  Logout
                </button>
              </li>
            </>
          )}
          {!loading && !isAuthenticated && (
            <>
              <li>
                <Link to="/login" className="hover:text-gray-300">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-gray-300">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
```