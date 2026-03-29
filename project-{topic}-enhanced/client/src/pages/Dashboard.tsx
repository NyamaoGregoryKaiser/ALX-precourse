import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-8">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="text-center mt-8 text-red-600">You must be logged in to view the dashboard.</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 border-b pb-4">Welcome to Your Dashboard, {user.username}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* User Profile Card */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Your Profile</h2>
          <p className="text-gray-700 mb-2"><strong>Email:</strong> {user.email}</p>
          <p className="text-gray-700 mb-2"><strong>Roles:</strong> {user.roles.join(', ')}</p>
          <Link to="/profile" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
            View/Edit Profile
          </Link>
        </div>

        {/* Products Management Card */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold text-green-700 mb-4">Product Management</h2>
          <p className="text-gray-700 mb-2">Manage your products, add new items, or update existing ones.</p>
          <Link to="/products" className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
            Go to Products
          </Link>
        </div>

        {/* Admin Section Card (Conditionally displayed) */}
        {user.roles.includes('admin') && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold text-red-700 mb-4">Admin Panel</h2>
            <p className="text-gray-700 mb-2">Access administrative functions like user management and system settings.</p>
            <Link to="/admin/users" className="inline-block mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
              Manage Users
            </Link>
          </div>
        )}

        {/* Other Sections Placeholder */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Settings</h2>
          <p className="text-gray-600 mb-2">Configure application settings and preferences.</p>
          <button className="inline-block mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md opacity-50 cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>

      <div className="mt-12 text-center text-gray-600">
        <p>You logged in on {new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString()}</p>
        <p>Last updated on {new Date(user.updatedAt).toLocaleDateString()} at {new Date(user.updatedAt).toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default DashboardPage;