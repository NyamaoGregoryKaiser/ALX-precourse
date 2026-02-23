```javascript
import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-extrabold text-primary">TaskMaster</h1>
          <p className="mt-4 text-2xl text-gray-700">Your ultimate task management solution.</p>
          <p className="mt-2 text-lg text-gray-500">
            Organize, track, and complete your projects with ease.
          </p>
        </div>
        <div className="flex justify-center space-x-4">
          <Link
            to="/login"
            className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-secondary transition duration-150 ease-in-out"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="flex items-center justify-center px-6 py-3 border border-primary text-base font-medium rounded-md text-primary bg-white hover:bg-indigo-50 transition duration-150 ease-in-out"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
```