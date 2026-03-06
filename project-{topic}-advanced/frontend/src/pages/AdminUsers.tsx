```typescript
import React, { useEffect, useState } from 'react';
import { getAllUsers, deleteUser, UserProfile } from '@api/user';
import { toast } from 'react-toastify';
import { useAuth } from '@hooks/useAuth';
import { UserRole } from '../../../backend/src/entities/Role'; // Adjust path if needed

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch users.');
        toast.error(err.response?.data?.message || 'Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    if (currentUser?.id === userId) {
        toast.error("You cannot delete your own admin account.");
        return;
    }
    try {
      await deleteUser(userId);
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      toast.success('User deleted successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  if (loading) {
    return <div className="container">Loading users...</div>;
  }

  if (error) {
    return <div className="container error-message">Error: {error}</div>;
  }

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div className="container error-message">You do not have administrative access.</div>;
  }

  return (
    <div className="container">
      <h1>Admin User Management</h1>
      <p>Manage all registered users in the system.</p>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Role</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Verified</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.id.substring(0, 8)}...</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.firstName} {user.lastName}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.role}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.isEmailVerified ? 'Yes' : 'No'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {currentUser?.id === user.id ? (
                    <span style={{color: '#999'}}>Current User</span>
                  ) : (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="button"
                      style={{ backgroundColor: '#dc3545', padding: '5px 10px', fontSize: '0.85em' }}
                    >
                      Delete
                    </button>
                  )}
                  {/* Additional actions like "Edit Role" or "View Details" could go here */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminUsersPage;
```