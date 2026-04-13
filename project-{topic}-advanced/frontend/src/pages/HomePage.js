import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import './HomePage.css';

function HomePage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    navigate('/dashboard');
    return null; // Don't render anything
  }

  return (
    <div className="homepage">
      <h1>Welcome to the Web Scraping Dashboard</h1>
      <p className="tagline">Automate your data extraction tasks with ease.</p>

      <div className="auth-container">
        <div className="auth-toggle">
          <button
            className={!isRegistering ? 'active' : ''}
            onClick={() => setIsRegistering(false)}
          >
            Login
          </button>
          <button
            className={isRegistering ? 'active' : ''}
            onClick={() => setIsRegistering(true)}
          >
            Register
          </button>
        </div>

        {isRegistering ? <RegisterForm /> : <LoginForm />}
      </div>
    </div>
  );
}

export default HomePage;