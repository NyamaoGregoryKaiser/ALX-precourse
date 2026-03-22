```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 text-gray-800">
      <h1 className="text-5xl font-extrabold mb-6 text-indigo-700">Welcome to the Product Catalog!</h1>
      <p className="text-xl text-gray-700 mb-8 max-w-2xl text-center">
        Your one-stop solution for managing and browsing a wide array of products.
      </p>

      {isAuthenticated ? (
        <div className="text-center">
          <p className="text-lg mb-4">Hello, <span className="font-semibold text-indigo-600">{user?.email}</span>!</p>
          <Link to="/products" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300">
            View Products
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin/products" className="ml-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300">
              Manage Products
            </Link>
          )}
        </div>
      ) : (
        <div className="space-x-4">
          <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300">
            Login
          </Link>
          <Link to="/register" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300">
            Register
          </Link>
        </div>
      )}

      <footer className="mt-12 text-gray-500 text-sm">
        &copy; 2024 ALX Software Engineering. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
```