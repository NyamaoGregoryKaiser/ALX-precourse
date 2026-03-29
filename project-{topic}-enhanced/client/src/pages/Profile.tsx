import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Alert from '@/components/Alert';
import Loader from '@/components/Loader';
import { toast } from 'react-toastify';

const ProfilePage: React.FC = () => {
  const { user, loading, error, clearError, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      // Error handled by AuthContext and toast
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <div className="text-center mt-8 text-red-600">Please log in to view your profile.</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 border-b pb-4">Your Profile</h1>

      {error && <Alert message={error} type="error" onClose={clearError} />}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none ${isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-100 cursor-not-allowed'}`}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none ${isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-100 cursor-not-allowed'}`}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none ${isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-100 cursor-not-allowed'}`}
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastName">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none ${isEditing ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-100 cursor-not-allowed'}`}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email Verified
            </label>
            <p className={`py-2 px-3 rounded ${user.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {user.isEmailVerified ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Roles
            </label>
            <p className="bg-gray-100 py-2 px-3 rounded text-gray-700">
              {user.roles.join(', ') || 'No roles assigned'}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                  });
                  clearError();
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </form>

      <div className="mt-12 text-sm text-gray-600 border-t pt-6">
        <p>Account created: {new Date(user.createdAt).toLocaleString()}</p>
        <p>Last updated: {new Date(user.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default ProfilePage;