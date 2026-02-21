import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon, RectangleGroupIcon, ArrowRightOnRectangleIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold flex items-center">
          ML-Utilities-Pro
        </Link>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link to="/" className="text-gray-300 hover:text-white flex items-center space-x-1">
                <HomeIcon className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <Link to="/projects" className="text-gray-300 hover:text-white flex items-center space-x-1">
                <RectangleGroupIcon className="h-5 w-5" />
                <span>Projects</span>
              </Link>
              <span className="text-gray-400">Hello, {user?.username || 'User'}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center space-x-1"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center space-x-1">
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Login</span>
              </Link>
              <Link to="/register" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center space-x-1">
                <UserPlusIcon className="h-5 w-5" />
                <span>Register</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;