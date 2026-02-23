```javascript
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  CheckCircleIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { AuthContext } from '../../contexts/AuthContext';

function Sidebar() {
  const { user, logout } = useContext(AuthContext);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: true },
    { name: 'Projects', href: '/projects', icon: FolderIcon, current: false },
    // { name: 'My Tasks', href: '/tasks/me', icon: CheckCircleIcon, current: false },
  ];

  const adminNavigation = [
    { name: 'Manage Users', href: '/admin/users', icon: UsersIcon, current: false },
  ];

  return (
    <div className="flex flex-col w-64 border-r border-gray-200 bg-white min-h-screen">
      <div className="flex items-center justify-center h-16 shrink-0 bg-white">
        <NavLink to="/dashboard" className="text-2xl font-extrabold text-primary">
          TaskMaster
        </NavLink>
      </div>
      <nav className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex-1 space-y-1 px-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md
                ${isActive
                  ? 'bg-indigo-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-6 w-6
                  ${({ isActive }) => isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`
                }
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          ))}

          {user && (user.role === 'admin' || user.role === 'manager') && (
            <>
              <div className="px-3 mt-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
              </div>
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive
                      ? 'bg-indigo-50 text-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-6 w-6
                      ${({ isActive }) => isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`
                    }
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
            </>
          )}
        </div>
      </nav>
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-700"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-red-500" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
```