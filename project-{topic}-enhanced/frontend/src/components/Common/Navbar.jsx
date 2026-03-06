```javascript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat'; // To disconnect socket on logout

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { disconnectSocket } = useChat(); // Use disconnectSocket from chat context
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(); // Clear auth state and local storage
    disconnectSocket(); // Disconnect the WebSocket
    navigate('/'); // Redirect to home page
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        Realtime Chat
      </Link>
      <div className="navbar-links">
        <Link to="/" className="navbar-link">Home</Link>
        {isAuthenticated && (
          <Link to="/chat" className="navbar-link">Chat</Link>
        )}
      </div>
      <div>
        {isAuthenticated ? (
          <div className="navbar-auth-info">
            Welcome, {user.username}!
            <button onClick={handleLogout} className="navbar-link" style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        ) : (
          <p className="navbar-auth-info">Please login or register.</p>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
```