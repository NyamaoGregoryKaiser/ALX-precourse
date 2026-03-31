```typescript
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: '#3e3e3e',
      color: 'white',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h1 style={{ margin: 0, fontSize: '1.5em' }}>Real-time Chat</h1>
      {isAuthenticated ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '15px' }}>Welcome, {user?.username}!</span>
          <button onClick={handleLogout} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}>
            Logout
          </button>
        </div>
      ) : (
        <div>
          <button onClick={() => navigate('/login')} style={{ marginRight: '10px' }}>Login</button>
          <button onClick={() => navigate('/register')}>Register</button>
        </div>
      )}
    </header>
  );
};

export default Header;
```