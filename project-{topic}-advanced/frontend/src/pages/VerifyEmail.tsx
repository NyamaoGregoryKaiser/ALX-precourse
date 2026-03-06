```typescript
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '@api/auth';
import { toast } from 'react-toastify';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');

    const handleVerification = async () => {
      if (!token) {
        setVerificationStatus('error');
        setMessage('No verification token found. Please check your email for the correct link or request a new one.');
        toast.error('No verification token found.');
        return;
      }

      try {
        const response = await verifyEmail(token);
        setVerificationStatus('success');
        setMessage(response.message || 'Email verified successfully! You can now log in.');
        toast.success(response.message || 'Email verified successfully!');
      } catch (error: any) {
        setVerificationStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed. The link might be invalid or expired.');
        toast.error(error.response?.data?.message || 'Email verification failed.');
      }
    };

    handleVerification();
  }, [searchParams]);

  return (
    <div className="container" style={{ textAlign: 'center' }}>
      {verificationStatus === 'loading' && (
        <>
          <h1>Email Verification</h1>
          <p>{message}</p>
        </>
      )}
      {verificationStatus === 'success' && (
        <>
          <h1 style={{ color: 'green' }}>Verification Successful!</h1>
          <p className="success-message">{message}</p>
          <p><Link to="/login" className="link">Click here to log in</Link>.</p>
        </>
      )}
      {verificationStatus === 'error' && (
        <>
          <h1 style={{ color: 'red' }}>Verification Failed</h1>
          <p className="error-message">{message}</p>
          <p>You can <Link to="/resend-verification" className="link">resend the verification email</Link> if needed.</p>
          <p><Link to="/login" className="link">Return to Login</Link></p>
        </>
      )}
    </div>
  );
};

export default VerifyEmailPage;
```