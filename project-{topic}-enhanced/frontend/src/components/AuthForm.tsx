```tsx
import React, { useState } from 'react';
import styled from 'styled-components';

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  width: 300px;
  margin: 50px auto;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-size: 14px;
`;

const SuccessMessage = styled.p`
  color: green;
  font-size: 14px;
`;

interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage?: string | null;
}

const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, loading, error, successMessage }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'register') {
      await onSubmit({ username, email, password });
    } else {
      await onSubmit({ email, password });
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <h2>{type === 'login' ? 'Login' : 'Register'}</h2>
      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {type === 'register' && (
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      )}
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Processing...' : type === 'login' ? 'Login' : 'Register'}
      </Button>
    </FormContainer>
  );
};

export default AuthForm;
```