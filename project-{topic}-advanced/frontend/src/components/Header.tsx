```typescript
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 sticky top-0">
      <div className="text-2xl font-bold text-blue-600">PerformancePulse</div>
      <div className="flex items-center space-x-4">
        {user && <span className="text-gray-700">Welcome, {user.username}</span>}
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
```