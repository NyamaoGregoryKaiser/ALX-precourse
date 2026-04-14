import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../UI/Button';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight hover:text-blue-100 transition-colors duration-200">
          TaskFlow
        </Link>
        <nav>
          {user ? (
            <ul className="flex space-x-6 items-center">
              <li>
                <Link to="/projects" className="text-lg hover:text-blue-100 transition-colors duration-200">
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/tasks" className="text-lg hover:text-blue-100 transition-colors duration-200">
                  Tasks
                </Link>
              </li>
              <li className="text-lg font-medium text-blue-200">
                Welcome, {user.firstName}!
              </li>
              <li>
                <Button onClick={handleLogout} secondary small>
                  Logout
                </Button>
              </li>
            </ul>
          ) : (
            <ul className="flex space-x-4">
              <li>
                <Link to="/login" className="bg-white text-blue-600 hover:bg-blue-100 transition-colors duration-200 px-4 py-2 rounded-md font-medium">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="bg-blue-500 hover:bg-blue-400 transition-colors duration-200 px-4 py-2 rounded-md font-medium">
                  Register
                </Link>
              </li>
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;