import React, { useState, useEffect } from 'react';
import * as userService from '@/services/user.service';
import { IUser, IRegisterPayload } from '@/types/auth.d';
import Loader from '@/components/Loader';
import Alert from '@/components/Alert';
import { toast } from 'react-toastify';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [newUserFormData, setNewUserFormData] = useState<IRegisterPayload>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch users.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: IUser) => {
    setEditingUser({ ...user, password: '' }); // Don't pre-fill password
  };

  const handleDeleteClick = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      setError(null);
      try {
        await userService.deleteUser(userId);
        toast.success('User deleted successfully!');
        fetchUsers();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to delete user.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
      }
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setError(null);
    try {
      const updatedUser = await userService.updateUser(editingUser.id, editingUser);
      toast.success('User updated successfully!');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update user.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewUserFormData({ ...newUserFormData, [e.target.name]: e.target.value });
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await userService.createUser(newUserFormData);
      toast.success('User created successfully!');
      setNewUserFormData({ username: '', email: '', password: '', firstName: '', lastName: '' }); // Clear form
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create user.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto p-6 bg-white shadow-lg rounded-lg mt-8">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 border-b pb-4">Admin: User Management</h1>

      {error && <Alert message={error} type="error" onClose={() => setError(null)} />}

      {/* Add New User Form */}
      <div className="mb-8 border p-6 rounded-md bg-gray-50">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add New User</h2>
        <form onSubmit={handleNewUserSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="username" placeholder="Username" value={newUserFormData.username} onChange={handleNewUserChange} required className="input-field" />
          <input type="email" name="email" placeholder="Email" value={newUserFormData.email} onChange={handleNewUserChange} required className="input-field" />
          <input type="password" name="password" placeholder="Password" value={newUserFormData.password} onChange={handleNewUserChange} required className="input-field" />
          <input type="text" name="firstName" placeholder="First Name (Optional)" value={newUserFormData.firstName} onChange={handleNewUserChange} className="input-field" />
          <input type="text" name="lastName" placeholder="Last Name (Optional)" value={newUserFormData.lastName} onChange={handleNewUserChange} className="input-field" />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary w-full">Create User</button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Existing Users</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">Username</th>
              <th className="py-3 px-6">Email</th>
              <th className="py-3 px-6">Roles</th>
              <th className="py-3 px-6">Verified</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6">{user.username}</td>
                <td className="py-3 px-6">{user.email}</td>
                <td className="py-3 px-6">{user.roles.join(', ')}</td>
                <td className="py-3 px-6">{user.isEmailVerified ? 'Yes' : 'No'}</td>
                <td className="py-3 px-6">
                  <button onClick={() => handleEditClick(user)} className="btn-secondary mr-2">Edit</button>
                  <button onClick={() => handleDeleteClick(user.id)} className="btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal/Form */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit User: {editingUser.username}</h2>
            <form onSubmit={handleUpdateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-gray-700 text-sm font-bold mt-2">Username:</label>
              <input type="text" name="username" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} required className="input-field col-span-2 md:col-span-1" />

              <label className="block text-gray-700 text-sm font-bold mt-2">Email:</label>
              <input type="email" name="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} required className="input-field col-span-2 md:col-span-1" />

              <label className="block text-gray-700 text-sm font-bold mt-2">First Name:</label>
              <input type="text" name="firstName" value={editingUser.firstName || ''} onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })} className="input-field col-span-2 md:col-span-1" />

              <label className="block text-gray-700 text-sm font-bold mt-2">Last Name:</label>
              <input type="text" name="lastName" value={editingUser.lastName || ''} onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })} className="input-field col-span-2 md:col-span-1" />

              <label className="block text-gray-700 text-sm font-bold mt-2">Email Verified:</label>
              <input type="checkbox" name="isEmailVerified" checked={editingUser.isEmailVerified} onChange={(e) => setEditingUser({ ...editingUser, isEmailVerified: e.target.checked })} className="form-checkbox h-5 w-5 text-blue-600 mt-3" />

              {/* Roles editing would require fetching all roles and presenting checkboxes/dropdowns */}
              {/* For simplicity, this example does not include inline role editing, but the backend supports it. */}
              {/* This would be a more complex UI component. */}
              <div className="md:col-span-2 flex justify-end space-x-4 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
```