import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <div className="p-6 text-center text-red-500">User not logged in.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Your Profile</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
        <div className="flex items-center space-x-6 mb-8">
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-indigo-500 flex items-center justify-center text-white text-5xl font-bold">
              {user.firstName[0]}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-gray-900">{user.firstName} {user.lastName}</h2>
            <p className="text-indigo-600 text-lg">{user.email}</p>
            <span className={`mt-2 inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {user.role.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Account Information</h3>
            <p className="text-gray-700"><strong>Member Since:</strong> {format(parseISO(user.createdAt), 'MMM dd, yyyy')}</p>
            <p className="text-gray-700"><strong>Last Updated:</strong> {format(parseISO(user.updatedAt), 'MMM dd, yyyy')}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Contact Information</h3>
            <p className="text-gray-700"><strong>Email:</strong> {user.email}</p>
            {/* Add more contact info fields if available in the User model */}
          </div>
        </div>

        {/* Example: Add options for password change / account settings */}
        <div className="mt-10 border-t border-gray-200 pt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Settings</h3>
          <button className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 hover:text-indigo-700 transition duration-150 ease-in-out">
            Change Password
          </button>
          {/* More settings here */}
        </div>
      </div>
    </div>
  );
};

export default Profile;
```

#### `frontend/src/pages/NotFound.tsx`
```typescript