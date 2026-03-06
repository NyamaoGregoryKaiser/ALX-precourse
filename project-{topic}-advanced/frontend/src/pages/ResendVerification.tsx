```typescript
import React, { useState } from 'react';
import { resendVerificationEmail } from '@api/auth';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const ResendVerificationPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await resendVerificationEmail(email);
      setMessage(response.message);
      toast.success(response.message);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to resend verification email.');
      toast.error(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Resend Verification Email</h1>
      <p>Enter your email address to resend the verification link.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email for verification"
          />
        </div>
        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Sending...' : 'Resend Verification Link'}
        </button>
      </form>
      {message && <p className="success-message" style={{marginTop: '20px'}}>{message}</p>}
      <p style={{ marginTop: '20px' }}>
        Already verified? <Link to="/login" className="link">Login</Link>
      </p>
    </div>
  );
};

export default ResendVerificationPage;
```