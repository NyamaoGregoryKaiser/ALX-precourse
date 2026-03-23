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

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLogin = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post<any, { data: { data: AuthResponse } }>('/auth/login', data);
      login(response.data.data);
      navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <AuthForm type="login" onSubmit={handleLogin} loading={loading} error={error} />
      <SwitchText>
        Don't have an account? <Link to="/register">Register here</Link>
      </SwitchText>
    </PageContainer>
  );
};

export default LoginPage;
```