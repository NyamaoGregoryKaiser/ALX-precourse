import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 p-6">
      <div className="bg-white p-10 rounded-lg shadow-xl text-center max-w-2xl w-full">
        <h1 className="text-5xl font-extrabold text-gray-800 mb-6">Welcome to the Auth System!</h1>
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          This is a comprehensive, production-ready full-stack authentication system built with Node.js (Express & TypeORM) and React, demonstrating robust security practices and scalable architecture.
        </p>

        {!isAuthenticated ? (
          <div className="space-x-4">
            <Link
              to="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300"
            >
              Login Now
            </Link>
            <Link
              to="/register"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300"
            >
              Register
            </Link>
          </div>
        ) : (
          <div className="text-lg text-gray-700">
            <p className="mb-4">Hello, <span className="font-semibold text-blue-600">{user?.username || 'Guest'}</span>!</p>
            <p className="mb-6">You are authenticated. Explore your dashboard or manage your profile.</p>
            <div className="space-x-4">
              <Link
                to="/dashboard"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/profile"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300"
              >
                View Profile
              </Link>
            </div>
          </div>
        )}

        <div className="mt-12 text-sm text-gray-500">
          <p>Built with ❤️ for ALX Software Engineering program.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;