```tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-yellow-400 hover:text-yellow-300">
          ALX-Shop
        </Link>

        <nav className="flex items-center space-x-6">
          <Link to="/" className="hover:text-gray-300 transition-colors duration-200">Home</Link>
          {/* <Link to="/products" className="hover:text-gray-300 transition-colors duration-200">Products</Link> */}
          <Link to="/cart" className="flex items-center hover:text-gray-300 transition-colors duration-200">
            <FaShoppingCart className="mr-1" /> Cart
            {/* Optional: Add cart item count */}
            {/* <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">3</span> */}
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/profile" className="flex items-center hover:text-gray-300 transition-colors duration-200">
                <FaUser className="mr-1" /> {user?.name.split(' ')[0] || 'Profile'}
              </Link>
              <button onClick={handleLogout} className="flex items-center hover:text-gray-300 transition-colors duration-200">
                <FaSignOutAlt className="mr-1" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="flex items-center hover:text-gray-300 transition-colors duration-200">
                <FaSignInAlt className="mr-1" /> Login
              </Link>
              <Link to="/register" className="flex items-center hover:text-gray-300 transition-colors duration-200">
                <FaUserPlus className="mr-1" /> Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
```