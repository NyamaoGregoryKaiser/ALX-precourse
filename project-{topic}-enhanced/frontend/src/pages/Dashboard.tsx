import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Project, Task, TaskStatus } from '../types';
import { projectApi, taskApi } from '../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [projectsRes, tasksRes] = await Promise.all([
          projectApi.getAllProjects(),
          taskApi.getAssignedTasks(TaskStatus.OPEN), // Get only open assigned tasks
        ]);
        setProjects(projectsRes.data);
        setAssignedTasks(tasksRes.data);
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Failed to load dashboard data';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Welcome, {user?.firstName}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Projects</h2>
          <p className="text-3xl font-bold text-indigo-600">{projects.length}</p>
          <Link to="/projects" className="text-indigo-500 hover:underline">View All Projects</Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Open Assigned Tasks</h2>
          <p className="text-3xl font-bold text-blue-600">{assignedTasks.length}</p>
          <Link to="/tasks/assigned" className="text-blue-500 hover:underline">View Your Tasks</Link>
        </div>

        {/* Placeholder for more stats */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Completed Tasks (This Month)</h2>
          <p className="text-3xl font-bold text-green-600">0</p> {/* Implement this in the future */}
          <span className="text-gray-500 text-sm">Coming Soon</span>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recently Assigned Tasks */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Open Tasks</h2>
          {assignedTasks.length === 0 ? (
            <p className="text-gray-600">No open tasks assigned to you. Time to relax!</p>
          ) : (
            <ul className="space-y-4">
              {assignedTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="border-b pb-2 last:border-b-0 flex justify-between items-center">
                  <div>
                    <Link to={`/projects/${task.projectId}/tasks/${task.id}`} className="text-lg font-medium text-indigo-600 hover:underline">
                      {task.title}
                    </Link>
                    <p className="text-sm text-gray-500">Project: {task.project.name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    task.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-800' :
                    task.priority === TaskPriority.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority.toUpperCase()}
                  </span>
                  {task.dueDate && <span className="text-sm text-gray-500">Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>}
                </li>
              ))}
              {assignedTasks.length > 5 && (
                <div className="text-right mt-4">
                  <Link to="/tasks/assigned" className="text-indigo-500 hover:underline">View All Tasks</Link>
                </div>
              )}
            </ul>
          )}
        </div>

        {/* Your Projects Overview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Projects</h2>
          {projects.length === 0 ? (
            <p className="text-gray-600">You haven't created any projects yet. <Link to="/projects/new" className="text-indigo-500 hover:underline">Start one now!</Link></p>
          ) : (
            <ul className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id} className="border-b pb-2 last:border-b-0">
                  <Link to={`/projects/${project.id}`} className="text-lg font-medium text-indigo-600 hover:underline">
                    {project.name}
                  </Link>
                  <p className="text-sm text-gray-500 line-clamp-2">{project.description || 'No description provided.'}</p>
                </li>
              ))}
              {projects.length > 5 && (
                <div className="text-right mt-4">
                  <Link to="/projects" className="text-indigo-500 hover:underline">View All Projects</Link>
                </div>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

#### `frontend/src/pages/Project/ProjectDetail.tsx`
```typescript