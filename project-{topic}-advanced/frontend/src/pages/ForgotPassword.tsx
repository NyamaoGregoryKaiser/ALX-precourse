```typescript
import React, { useState } from 'react';
import { forgotPassword } from '@api/auth';
import { toast } from 'react-toastify';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await forgotPassword(email);
      setMessage(response.message);
      toast.success(response.message);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to send password reset email.');
      toast.error(error.response?.data?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Forgot Password</h1>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email for password reset"
          />
        </div>
        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      {message && <p className="success-message" style={{marginTop: '20px'}}>{message}</p>}
    </div>
  );
};

export default ForgotPasswordPage;
```