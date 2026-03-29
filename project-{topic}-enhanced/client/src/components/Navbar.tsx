import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition-colors duration-200">
          Auth System
        </Link>
        <div className="flex space-x-4">
          <Link to="/" className="hover:text-blue-200 transition-colors duration-200">Home</Link>
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="hover:text-blue-200 transition-colors duration-200">Dashboard</Link>
              <Link to="/profile" className="hover:text-blue-200 transition-colors duration-200">Profile</Link>
              <Link to="/products" className="hover:text-blue-200 transition-colors duration-200">Products</Link>
              {user?.roles?.includes('admin') && ( // Simple client-side role check for UI display
                <Link to="/admin/users" className="hover:text-blue-200 transition-colors duration-200">Admin Users</Link>
              )}
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md transition-colors duration-200">Logout</button>
            </>
          )}
          {!isAuthenticated && !loading && (
            <>
              <Link to="/login" className="hover:text-blue-200 transition-colors duration-200">Login</Link>
              <Link to="/register" className="hover:text-blue-200 transition-colors duration-200">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;