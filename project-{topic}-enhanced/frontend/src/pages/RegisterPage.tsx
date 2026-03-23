```tsx
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from 'api/axiosInstance';
import AuthForm from 'components/AuthForm';
import { AuthContext } from 'contexts/AuthContext';
import { AuthResponse } from 'types';
import styled from 'styled-components';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f0f2f5;
`;

const SwitchText = styled.p`
  margin-top: 20px;
  font-size: 14px;
  color: #555;

  a {
    color: #007bff;
    text-decoration: none;
    font-weight: bold;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleRegister = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await axiosInstance.post<any, { data: { data: AuthResponse } }>('/auth/register', data);
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      // Optionally, auto-login after register
      // login(response.data.data);
      // navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <AuthForm
        type="register"
        onSubmit={handleRegister}
        loading={loading}
        error={error}
        successMessage={successMessage}
      />
      <SwitchText>
        Already have an account? <Link to="/login">Login here</Link>
      </SwitchText>
    </PageContainer>
  );
};

export default RegisterPage;
```