```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Hello, {user?.firstName}! Welcome to TaskFlow.</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-3 text-blue-600">My Projects</h2>
          <p className="text-gray-700 mb-4">View and manage all your projects.</p>
          <Link to="/projects" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md">
            Go to Projects
          </Link>
        </div>

        {/* This would require a backend endpoint to fetch tasks assigned to the current user globally */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-3 text-green-600">My Tasks</h2>
          <p className="text-gray-700 mb-4">See all tasks assigned to you across different projects.</p>
          <button
            onClick={() => alert('This feature requires a dedicated "My Tasks" API endpoint and component.')}
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md opacity-50 cursor-not-allowed"
            disabled // Disable until implemented
          >
            View My Tasks
          </button>
        </div>

        {/* Example: Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-3 text-purple-600">Notifications</h2>
          <p className="text-gray-700 mb-4">Stay updated with important activities.</p>
          <button
            onClick={() => alert('Notifications feature coming soon!')}
            className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-md opacity-50 cursor-not-allowed"
            disabled // Disable until implemented
          >
            View Notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```