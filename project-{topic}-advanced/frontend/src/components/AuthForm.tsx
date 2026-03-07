```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AuthFormProps {
  type: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const [username, setUsername] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState(''); // For login
  const [email, setEmail] = useState(''); // For register
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (type === 'login') {
        await login({ emailOrUsername, password });
      } else {
        await register({ username, email, password });
      }
      // navigate is handled by AuthContext on successful login/register
    } catch (err: any) {
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {type === 'login' ? 'Login' : 'Register'}
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          {type === 'register' && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={type === 'login' ? 'emailOrUsername' : 'email'}>
              {type === 'login' ? 'Email or Username' : 'Email'}
            </label>
            <input
              type="text"
              id={type === 'login' ? 'emailOrUsername' : 'email'}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={type === 'login' ? emailOrUsername : email}
              onChange={(e) => (type === 'login' ? setEmailOrUsername(e.target.value) : setEmail(e.target.value))}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : type === 'login' ? 'Sign In' : 'Register'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-gray-600">
          {type === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => navigate('/register')} className="text-blue-500 hover:text-blue-800">
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-blue-500 hover:text-blue-800">
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
```