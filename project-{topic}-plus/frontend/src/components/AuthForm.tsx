```typescript
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginFormFields, RegisterFormFields } from 'types';

interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (data: LoginFormFields | RegisterFormFields) => void;
  isLoading: boolean;
  error: string | null;
}

const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'login') {
      onSubmit({ username, password });
    } else {
      onSubmit({ username, email, full_name: fullName, password });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="mb-6">{type === 'login' ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-textSecondary text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {type === 'register' && (
            <>
              <div>
                <label htmlFor="email" className="block text-textSecondary text-sm font-bold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="fullName" className="block text-textSecondary text-sm font-bold mb-2">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  id="fullName"
                  className="input-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="block text-textSecondary text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? 'Loading...' : (type === 'login' ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center text-textSecondary">
          {type === 'login' ? (
            <>
              Don't have an account?{' '}
              <Link to="/register" className="link-text">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="link-text">
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
```