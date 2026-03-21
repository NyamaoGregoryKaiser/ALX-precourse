```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (credentials: any) => {
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken, user } = await authService.login(credentials);
      login({ accessToken, refreshToken }, user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AuthForm type="login" onSubmit={handleLogin} loading={loading} error={error} />
      <p style={{ textAlign: 'center' }}>Don't have an account? <a href="/register">Register here</a></p>
    </div>
  );
};

export default LoginPage;
```