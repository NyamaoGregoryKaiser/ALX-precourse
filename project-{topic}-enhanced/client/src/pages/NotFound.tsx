import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-10 rounded-lg shadow-md text-center">
        <h1 className="text-6xl font-extrabold text-red-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Page Not Found</h2>
        <p className="text-lg text-gray-600 mb-8">
          Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          to="/" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;