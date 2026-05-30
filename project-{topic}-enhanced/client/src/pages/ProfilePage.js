import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <div className="text-center mt-8">Please log in to view your profile.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">User Profile</h2>
      <div className="space-y-4">
        <p className="text-lg"><strong>First Name:</strong> {user.firstName}</p>
        <p className="text-lg"><strong>Last Name:</strong> {user.lastName}</p>
        <p className="text-lg"><strong>Email:</strong> {user.email}</p>
        <p className="text-lg"><strong>Role:</strong> {user.role}</p>
        {/* Add more user details as needed */}
      </div>
    </div>
  );
};

export default ProfilePage;