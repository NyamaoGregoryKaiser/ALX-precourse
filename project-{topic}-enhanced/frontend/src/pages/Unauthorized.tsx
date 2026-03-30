import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800 p-4">
      <h1 className="text-9xl font-extrabold text-red-600">403</h1>
      <h2 className="text-3xl font-semibold mt-4 mb-2">Access Denied</h2>
      <p className="text-lg text-center mb-8">
        You do not have the necessary permissions to view this page.
      </p>
      {isAuthenticated && user ? (
        <Link
          to="/"
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out"
        >
          Go to Dashboard
        </Link>
      ) : (
        <Link
          to="/login"
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out"
        >
          Login
        </Link>
      )}
    </div>
  );
};

export default Unauthorized;
```

#### `frontend/src/index.tsx`
```typescript