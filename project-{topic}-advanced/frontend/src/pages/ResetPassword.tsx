```typescript
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '@api/auth';
import { toast } from 'react-toastify';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      setMessage('No reset token found in URL.');
      toast.error('No reset token found in URL.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMessage('Reset token is missing.');
      toast.error('Reset token is missing.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.message);
      toast.success(response.message);
      navigate('/login'); // Redirect to login after successful reset
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to reset password.');
      toast.error(error.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Reset Password</h1>
      {!token ? (
        <p className="error-message">Invalid or missing reset token. Please request a new password reset link.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password:</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              aria-label="New Password"
            />
            <p style={{fontSize: '0.8em', color: '#666'}}>
              Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.
            </p>
          </div>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
      {message && <p className={message.includes('success') ? 'success-message' : 'error-message'} style={{marginTop: '20px'}}>{message}</p>}
    </div>
  );
};

export default ResetPasswordPage;
```