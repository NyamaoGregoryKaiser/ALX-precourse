import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition duration-300">
          ALX Chat
        </Link>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <span className="text-lg font-medium">Welcome, {user?.username || 'User'}!</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md shadow-md transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-md shadow-md transition duration-300">
                Login
              </Link>
              <Link to="/register" className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-md shadow-md transition duration-300">
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