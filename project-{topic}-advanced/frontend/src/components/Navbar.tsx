```typescript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { toast } from 'react-toastify';
import { logoutUser } from '@api/auth';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout: clientLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      clientLogout();
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Logout failed.');
    }
  };

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        {isAuthenticated ? (
          <>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/profile">Profile</Link></li>
            {user?.role === 'admin' && <li><Link to="/admin/users">Admin Users</Link></li>}
            <li>
              <button onClick={handleLogout} className="button" style={{ backgroundColor: '#dc3545' }}>
                Logout ({user?.email})
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
```