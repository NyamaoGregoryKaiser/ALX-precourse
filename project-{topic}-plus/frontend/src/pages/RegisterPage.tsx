```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from 'components/AuthForm';
import { RegisterFormFields } from 'types';
import axiosInstance from 'api/axiosInstance';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (data: RegisterFormFields) => {
    setIsLoading(true);
    setError(null);
    try {
      await axiosInstance.post('/api/v1/auth/register', data);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response) {
        setError(err.response.data.detail || 'Registration failed.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <AuthForm type="register" onSubmit={handleRegister} isLoading={isLoading} error={error} />;
};

export default RegisterPage;
```