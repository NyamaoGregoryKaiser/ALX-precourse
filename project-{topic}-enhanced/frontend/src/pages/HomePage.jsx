```javascript
import React from 'react';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

function HomePage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p>Loading authentication status...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="home-page">
      <h1>Welcome to Realtime Chat!</h1>
      <p>
        Experience seamless real-time communication. Register an account or log in to join channels,
        send messages, and connect with others instantly.
      </p>
      <div className="auth-forms">
        <Login />
        <Register />
      </div>
    </div>
  );
}

export default HomePage;
```