import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Alert from '@/components/Alert';
import Loader from '@/components/Loader';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard'); // Redirect to dashboard if already logged in
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); // Clear previous errors
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      // Error handled by AuthContext and toast, no need to do much here
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h2>
        {error && <Alert message={error} type="error" onClose={clearError} />}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
            >
              Sign In
            </button>
            <Link to="/register" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;