```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth(); // Automatically log in after registration

  const handleRegister = async (userData: any) => {
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken, user } = await authService.register(userData);
      login({ accessToken, refreshToken }, user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AuthForm type="register" onSubmit={handleRegister} loading={loading} error={error} />
      <p style={{ textAlign: 'center' }}>Already have an account? <a href="/login">Login here</a></p>
    </div>
  );
};

export default RegisterPage;
```