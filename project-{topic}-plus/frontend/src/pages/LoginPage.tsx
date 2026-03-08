```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from 'components/AuthForm';
import { LoginFormFields } from 'types';
import axiosInstance from 'api/axiosInstance';
import { useAuth } from 'hooks/useAuth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: LoginFormFields) => {
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Get JWT token
      const tokenResponse = await axiosInstance.post('/api/v1/auth/token', new URLSearchParams(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const { access_token } = tokenResponse.data;

      // Step 2: Fetch user data using the token
      const userResponse = await axiosInstance.get('/api/v1/users/me', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      const user = userResponse.data;

      // Step 3: Log in and redirect
      login(access_token, user);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response) {
        setError(err.response.data.detail || 'Login failed.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <AuthForm type="login" onSubmit={handleLogin} isLoading={isLoading} error={error} />;
};

export default LoginPage;
```