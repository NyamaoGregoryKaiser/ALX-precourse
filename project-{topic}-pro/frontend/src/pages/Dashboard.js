```javascript
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import projectService from '../services/projectService';
import taskService from '../services/taskService';
import {
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState({
    totalProjects: 0,
    myTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    latestProjects: [],
    recentActivities: [], // Placeholder for future activity log
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const projects = await projectService.getProjects();
        const allMyTasks = await taskService.getTasksByProjectId(''); // Fetch all tasks assigned to me (if backend supports this query or iterate projects)

        let totalPending = 0;
        let totalCompleted = 0;
        let myAssignedTasks = 0;

        // Iterate through projects to find tasks assigned to the current user
        // A more efficient way would be a backend endpoint for 'my tasks'.
        for (const project of projects) {
            const projectTasks = await taskService.getTasksByProjectId(project._id);
            const userTasks = projectTasks.filter(task => task.assignedTo && task.assignedTo._id === user.id);
            myAssignedTasks += userTasks.length;
            totalPending += userTasks.filter(task => task.status !== 'Done' && task.status !== 'Cancelled').length;
            totalCompleted += userTasks.filter(task => task.status === 'Done').length;
        }

        setDashboardData({
          totalProjects: projects.length,
          myTasks: myAssignedTasks,
          pendingTasks: totalPending,
          completedTasks: totalCompleted,
          latestProjects: projects.slice(0, 5), // Show latest 5 projects
          recentActivities: [], // Future implementation
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <p className="text-lg text-gray-700 mb-8">Welcome back, {user?.username}!</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
          <FolderIcon className="h-10 w-10 text-primary" />
          <div>
            <p className="text-gray-500 text-sm">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900">{dashboardData.totalProjects}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
          <CheckCircleIcon className="h-10 w-10 text-green-500" />
          <div>
            <p className="text-gray-500 text-sm">My Completed Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{dashboardData.completedTasks}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
          <ClockIcon className="h-10 w-10 text-yellow-500" />
          <div>
            <p className="text-gray-500 text-sm">My Pending Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingTasks}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
          <ExclamationCircleIcon className="h-10 w-10 text-red-500" />
          <div>
            <p className="text-gray-500 text-sm">My Total Assigned Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{dashboardData.myTasks}</p>
          </div>
        </div>
      </div>

      {/* Latest Projects */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FolderIcon className="h-5 w-5 mr-2 text-primary" /> Latest Projects
        </h2>
        {dashboardData.latestProjects.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {dashboardData.latestProjects.map((project) => (
              <li key={project._id} className="py-3 flex justify-between items-center">
                <Link to={`/projects/${project._id}`} className="text-primary hover:underline font-medium">
                  {project.name}
                </Link>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'}`
                  }>
                  {project.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No projects to display. Start by creating a new one!</p>
        )}
      </div>

      {/* Recent Activities - Placeholder for future */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowPathIcon className="h-5 w-5 mr-2 text-primary" /> Recent Activities
        </h2>
        <p className="text-gray-500">Activity logging and display coming soon.</p>
        {/*
        <ul>
          {dashboardData.recentActivities.length > 0 ? (
            dashboardData.recentActivities.map((activity, index) => (
              <li key={index} className="py-2 text-gray-700">
                {activity.message} - <span className="text-gray-500 text-sm">{activity.timestamp}</span>
              </li>
            ))
          ) : (
            <p className="text-gray-500">No recent activities.</p>
          )}
        </ul>
        */}
      </div>
    </div>
  );
}

export default Dashboard;
```