```javascript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { currentUser, isAdmin, isEditor, isViewer } = useAuth();

  if (!currentUser) return <div>Please log in to view the dashboard.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Welcome to your Dashboard, {currentUser.username}!</h1>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
        <p><strong>Email:</strong> {currentUser.email}</p>
        <p><strong>Role:</strong> <span className={`px-2 py-1 rounded text-white ${
            isAdmin ? 'bg-red-500' : isEditor ? 'bg-blue-500' : 'bg-gray-500'
          }`}>{currentUser.role.toUpperCase()}</span></p>
        <p><strong>ID:</strong> {currentUser.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(isAdmin || isEditor) && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">Content Management</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><a href="/posts/new" className="text-blue-600 hover:underline">Create New Post</a></li>
              <li><a href="/posts/manage" className="text-blue-600 hover:underline">Manage My Posts</a></li>
              <li><a href="/categories/manage" className="text-blue-600 hover:underline">Manage Categories</a></li>
            </ul>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">User Management</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><a href="/users/new" className="text-blue-600 hover:underline">Create New User</a></li>
              <li><a href="/users/manage" className="text-blue-600 hover:underline">Manage All Users</a></li>
            </ul>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">General Actions</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><a href="/settings" className="text-blue-600 hover:underline">Account Settings</a></li>
            <li><a href="/posts" className="text-blue-600 hover:underline">View All Posts</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
```