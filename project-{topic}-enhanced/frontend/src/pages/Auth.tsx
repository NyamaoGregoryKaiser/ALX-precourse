```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

interface AuthPageProps {
  registerMode?: boolean;
}

const AuthContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px); /* Adjust for Navbar height if present */
  background-color: var(--background-color);
`;

const AuthCard = styled.div`
  background-color: var(--card-background);
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Title = styled.h2`
  margin-bottom: 1.5rem;
  color: var(--dark-color);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 1rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.85rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: darken(var(--primary-color), 10%);
  }

  &:disabled {
    background-color: var(--secondary-color);
    cursor: not-allowed;
  }
`;

const ToggleLink = styled.p`
  margin-top: 1.5rem;
  font-size: 0.9rem;
  a {
    color: var(--primary-color);
    font-weight: bold;
    &:hover {
      text-decoration: none;
    }
  }
`;

const ErrorMessage = styled.p`
  color: var(--danger-color);
  margin-top: 1rem;
  font-weight: bold;
`;

/**
 * Authentication page for user login and registration.
 * Uses `react-router-dom` for navigation and `AuthContext` for state management.
 */
const AuthPage: React.FC<AuthPageProps> = ({ registerMode = false }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (registerMode) {
        // Register logic
        const response = await api.post('/auth/register', { email, password });
        console.log('Registration successful:', response.data);
        alert('Registration successful! Please log in.');
        navigate('/login');
      } else {
        // Login logic
        const response = await api.post('/auth/login', { email, password });
        console.log('Login successful:', response.data);
        login(response.data.token, response.data.role); // Update AuthContext
        navigate('/dashboard'); // Redirect to dashboard
      }
    } catch (err: any) {
      console.error('Authentication error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <Title>{registerMode ? 'Register' : 'Login'}</Title>
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="email">Email:</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email"
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">Password:</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="Password"
            />
          </FormGroup>
          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (registerMode ? 'Registering...' : 'Logging In...') : (registerMode ? 'Register' : 'Login')}
          </Button>
        </form>
        <ToggleLink>
          {registerMode ? (
            <>
              Already have an account? <a href="/login">Login here</a>
            </>
          ) : (
            <>
              Don't have an account? <a href="/register">Register here</a>
            </>
          )}
        </ToggleLink>
      </AuthCard>
    </AuthContainer>
  );
};

export default AuthPage;
```