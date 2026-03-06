```typescript
import React, { useEffect, useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { getUserProfile, UserProfile } from '@api/user';
import { toast } from 'react-toastify';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setError('User ID not available.');
        setLoading(false);
        return;
      }
      try {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch profile.');
        toast.error(err.response?.data?.message || 'Failed to fetch profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  if (loading) {
    return <div className="container">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="container error-message">Error: {error}</div>;
  }

  return (
    <div className="container">
      <h1>Welcome to Your Dashboard, {profile?.firstName}!</h1>
      <p>This is a protected area, accessible only to authenticated users.</p>
      {profile && (
        <div>
          <h2>Your Profile Summary:</h2>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Name:</strong> {profile.firstName} {profile.lastName}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Email Verified:</strong> {profile.isEmailVerified ? 'Yes' : 'No'}</p>
          {!profile.isEmailVerified && (
            <p className="error-message">
              Please verify your email to unlock all features. You can resend the verification email <a href="/resend-verification" className="link">here</a>.
            </p>
          )}
        </div>
      )}
      <p>
        Feel free to explore other protected sections or manage your <a href="/profile" className="link">profile</a>.
      </p>
    </div>
  );
};

export default DashboardPage;
```