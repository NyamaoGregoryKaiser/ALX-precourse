```typescript
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Projects', path: '/projects', icon: '📁' },
    // { name: 'Alerts', path: '/alerts', icon: '🔔' }, // Global alerts view, if implemented
    // { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 shadow-xl">
      <div className="text-2xl font-bold mb-8 text-center text-blue-400">
        PerformancePulse
      </div>
      <nav className="flex-1">
        <ul>
          {navItems.map((item) => (
            <li key={item.name} className="mb-2">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center p-3 rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`
                }
                end // Use 'end' for exact matching to prevent partial matches
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 text-center text-gray-400 text-sm">
        {user ? `Logged in as ${user.username}` : 'Guest'}
      </div>
    </aside>
  );
};

export default Sidebar;
```