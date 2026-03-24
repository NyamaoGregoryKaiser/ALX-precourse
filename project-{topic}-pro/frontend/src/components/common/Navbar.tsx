```typescript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          TaskFlow
        </Link>
        <div>
          {user ? (
            <>
              <span className="mr-4">Welcome, {user.firstName}!</span>
              <Link to="/projects" className="mr-4 hover:text-gray-300">
                Projects
              </Link>
              {/* Add other authenticated links */}
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mr-4 hover:text-gray-300">
                Login
              </Link>
              <Link to="/register" className="hover:text-gray-300">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
```