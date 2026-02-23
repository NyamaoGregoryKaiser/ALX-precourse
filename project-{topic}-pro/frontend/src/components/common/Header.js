```javascript
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">TaskMaster</span>
        </Link>

        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {user && (
            <div className="relative group">
              <button className="flex items-center p-2 rounded-full bg-primary text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                <span className="sr-only">Open user menu</span>
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out">
                <div className="px-4 py-2 text-sm text-gray-700">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-gray-500">{user.email}</p>
                  <p className="text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="border-t border-gray-100"></div>
                <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
```