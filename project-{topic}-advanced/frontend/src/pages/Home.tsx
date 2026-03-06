```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="container">
      <h1>Welcome to the Authentication System!</h1>
      {isAuthenticated ? (
        <>
          <p>Hello, {user?.firstName}!</p>
          <p>You are logged in as a {user?.role}.</p>
          <p>Go to your <Link to="/dashboard" className="link">Dashboard</Link>.</p>
          <p>Check out your <Link to="/profile" className="link">Profile</Link>.</p>
          {user?.role === 'admin' && (
            <p>Admin features available at <Link to="/admin/users" className="link">Admin Users</Link>.</p>
          )}
        </>
      ) : (
        <>
          <p>Please <Link to="/login" className="link">Login</Link> or <Link to="/register" className="link">Register</Link> to continue.</p>
        </>
      )}
    </div>
  );
};

export default HomePage;
```