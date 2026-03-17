```javascript
import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import './UserList.css';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalItems: 0 });
  const { user: currentUser } = useAuth(); // Logged-in user

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      }).toString();

      const response = await apiClient.get(`/users?${queryParams}`);
      setUsers(response.data.data.users);
      setPagination({
        ...pagination,
        totalItems: response.data.data.totalItems,
        totalPages: response.data.data.totalPages,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users.');
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit]);

  const handleDelete = async (id) => {
    if (currentUser && currentUser.id === id) {
      setError("You cannot delete your own account from this interface.");
      return;
    }
    if (window.confirm('Are you sure you want to soft-delete this user?')) {
      try {
        await apiClient.delete(`/users/${id}`);
        setUsers(users.filter(u => u.id !== id)); // Optimistic UI update
        fetchUsers(); // Re-fetch to confirm deletion or get updated list
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete user.');
        console.error('Failed to delete user:', err);
      }
    }
  };

  const handleRestore = async (id) => {
    if (window.confirm('Are you sure you want to restore this user?')) {
      try {
        await apiClient.post(`/users/${id}/restore`);
        fetchUsers(); // Re-fetch to show the restored item
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to restore user.');
        console.error('Failed to restore user:', err);
      }
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="user-list-container">
      <h2>User Management (Admin)</h2>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Activated</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.isActivated ? 'Yes' : 'No'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {currentUser?.id !== user.id && ( // Prevent admin from deleting self
                    <button onClick={() => handleDelete(user.id)} className="button delete small">
                      Delete
                    </button>
                  )}
                  {user.deletedAt && (
                    <button onClick={() => handleRestore(user.id)} className="button restore small">
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          disabled={pagination.page <= 1}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UserList;
```