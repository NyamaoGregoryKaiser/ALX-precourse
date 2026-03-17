```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-container">
      <h1>Welcome to the Product Management System!</h1>
      {isAuthenticated ? (
        <div className="logged-in-message">
          <p>Hello, {user?.username}! You are logged in as an {user?.role}.</p>
          <p>Explore our <Link to="/products">products</Link>.</p>
          {user?.role === 'admin' && (
            <p>As an admin, you can also manage <Link to="/users">users</Link>.</p>
          )}
        </div>
      ) : (
        <div className="logged-out-message">
          <p>Please <Link to="/login">log in</Link> or <Link to="/register">register</Link> to manage products.</p>
        </div>
      )}
      <div className="home-features">
        <h2>Features:</h2>
        <ul>
          <li>User Authentication (Login, Register, Logout)</li>
          <li>Role-Based Authorization (User, Admin)</li>
          <li>CRUD Operations for Products</li>
          <li>Admin control over Users</li>
          <li>Secure and Scalable API</li>
          <li>Frontend for easy interaction</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
```