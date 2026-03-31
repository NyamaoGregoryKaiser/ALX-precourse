```typescript
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

interface AuthFormProps {
  type: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === 'login') {
        await login(email, password);
        navigate('/home');
      } else {
        await register(username, email, password);
        navigate('/home');
      }
    } catch (error) {
      // Error handled by AuthContext via toast
      console.error(`Auth ${type} failed:`, error);
    }
  };

  return (
    <div className="auth-card">
      <h2>{type === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        {type === 'register' && (
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : (type === 'login' ? 'Login' : 'Register')}
        </button>
      </form>
      {type === 'login' ? (
        <p>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      ) : (
        <p>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      )}
    </div>
  );
};

export default AuthForm;
```