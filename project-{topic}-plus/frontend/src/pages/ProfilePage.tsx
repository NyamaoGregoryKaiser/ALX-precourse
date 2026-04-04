```typescript
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as userService from '../services/user';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user, loading, updateUserProfile } = useAuth();
  const [username, setUsername] = useState<string>(user?.username || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [status, setStatus] = useState<string>(user?.status || 'OFFLINE');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setStatus(user.status || 'OFFLINE');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!user) {
      setError('User not logged in.');
      return;
    }

    try {
      // NOTE: This example currently only supports updating status.
      // For username/email, you'd need a backend endpoint to handle it.
      // Assuming a simplified update for now.
      // const updatedUser = await userService.updateUser(user.id, { username, email, status: status as 'ONLINE' | 'OFFLINE' | 'AWAY' });
      // updateUserProfile(updatedUser);

      // For this example, we'll simulate only status update
      // A proper API endpoint to update status would be needed
      // await userService.updateMyStatus(status as 'ONLINE' | 'OFFLINE' | 'AWAY');
      // For now, we'll just update client-side
      updateUserProfile({ status: status as 'ONLINE' | 'OFFLINE' | 'AWAY' });

      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  if (loading) return <div className="profile-loading">Loading profile...</div>;
  if (!user) return <div className="profile-unauthenticated">Please log in to view your profile.</div>;

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled // Username updates are often restricted or require complex logic
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled // Email updates are often restricted or require complex logic
          />
        </div>
        <div className="form-group">
          <label htmlFor="status">Status:</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="AWAY">Away</option>
          </select>
          <p className="note-text">Note: Status is updated automatically by connection or can be changed via chat UX.</p>
        </div>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled>Update Profile (read-only for this demo)</button>
      </form>
    </div>
  );
};

export default ProfilePage;
```