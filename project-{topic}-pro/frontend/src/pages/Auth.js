import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const AuthPage = ({ type }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (type === 'login') {
        await login(username, password);
        navigate('/dashboard');
      } else { // register
        await register(username, email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="auth-container">
      <h2>{type === 'login' ? 'Login' : 'Register'}</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-form">
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
        {type === 'register' && (
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
        )}
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
        <button type="submit" className="submit-button">
          {type === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
      {type === 'login' ? (
        <p>Don't have an account? <Link to="/register">Register here</Link></p>
      ) : (
        <p>Already have an account? <Link to="/login">Login here</Link></p>
      )}
    </div>
  );
};

export default AuthPage;