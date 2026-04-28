import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../utils/types';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-md dark:bg-gray-950">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold hover:text-blue-300">
          MLU-Sys
        </Link>
        <div className="flex space-x-4 items-center">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-300 hover:text-white">
                Dashboard
              </Link>
              <Link to="/datasets" className="text-gray-300 hover:text-white">
                Datasets
              </Link>
              <Link to="/models" className="text-gray-300 hover:text-white">
                Models
              </Link>
              {user.role === Role.Admin && (
                <Link to="/users" className="text-gray-300 hover:text-white">
                  Users (Admin)
                </Link>
              )}
              <span className="text-gray-400">Welcome, {user.username} ({user.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition duration-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white">
                Login
              </Link>
              <Link to="/register" className="text-gray-300 hover:text-white">
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