```typescript
import React, { useEffect, useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { getUserProfile, updateProfile, changePassword, UserProfile, UpdateUserPayload, ChangePasswordPayload } from '@api/user';
import { toast } from 'react-toastify';

const ProfilePage: React.FC = () => {
  const { user, updateUser: updateAuthContextUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateUserPayload>({});
  const [passwordChangeData, setPasswordChangeData] = useState<ChangePasswordPayload>({
    currentPassword: '',
    newPassword: '',
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
        setEditData({
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email,
        });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const response = await updateProfile(user.id, editData);
      setProfile(response.user);
      updateAuthContextUser(response.user); // Update user in AuthContext
      toast.success(response.message || 'Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const response = await changePassword(user.id, passwordChangeData);
      toast.success(response.message || 'Password changed successfully!');
      setPasswordChangeData({ currentPassword: '', newPassword: '' });
      setIsPasswordChanging(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    }
  };

  if (loading) {
    return <div className="container">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="container error-message">Could not load user profile.</div>;
  }

  return (
    <div className="container">
      <h1>My Profile</h1>
      {profile && (
        <div>
          <h2>User Information</h2>
          <p><strong>ID:</strong> {profile.id}</p>
          <p><strong>First Name:</strong> {profile.firstName}</p>
          <p><strong>Last Name:</strong> {profile.lastName}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Email Verified:</strong> {profile.isEmailVerified ? 'Yes' : 'No'}</p>
          <p><strong>Member Since:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>

          <button onClick={() => setIsEditing(!isEditing)} className="button" style={{ marginTop: '20px' }}>
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button onClick={() => setIsPasswordChanging(!isPasswordChanging)} className="button" style={{ marginTop: '20px', marginLeft: '10px', backgroundColor: '#6c757d' }}>
            {isPasswordChanging ? 'Cancel Password Change' : 'Change Password'}
          </button>

          {isEditing && (
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <h3>Edit Profile</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label htmlFor="editFirstName">First Name:</label>
                  <input
                    type="text"
                    id="editFirstName"
                    name="firstName"
                    value={editData.firstName || ''}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editLastName">Last Name:</label>
                  <input
                    type="text"
                    id="editLastName"
                    name="lastName"
                    value={editData.lastName || ''}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editEmail">Email:</label>
                  <input
                    type="email"
                    id="editEmail"
                    name="email"
                    value={editData.email || ''}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <button type="submit" className="button">Save Changes</button>
              </form>
            </div>
          )}

          {isPasswordChanging && (
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <h3>Change Password</h3>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password:</label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordChangeData.currentPassword}
                    onChange={(e) => setPasswordChangeData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password:</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordChangeData.newPassword}
                    onChange={(e) => setPasswordChangeData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                  <p style={{fontSize: '0.8em', color: '#666'}}>
                    Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                  </p>
                </div>
                <button type="submit" className="button" style={{ backgroundColor: '#28a745' }}>Change Password</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
```