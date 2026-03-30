import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { taskApi } from '../../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner';
import { format, parseISO } from 'date-fns';

const AssignedTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  const fetchAssignedTasks = async () => {
    setLoading(true);
    try {
      const response = await taskApi.getAssignedTasks(filterStatus === 'all' ? undefined : filterStatus);
      setTasks(response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load assigned tasks';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedTasks();
  }, [filterStatus]);

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskApi.updateTask(taskId, { status: newStatus });
      toast.success('Task status updated!');
      // Update the task in the local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ).filter(task => filterStatus === 'all' || task.status === filterStatus) // Filter if status changed and no longer matches
      );
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update task status';
      toast.error(message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Your Assigned Tasks</h1>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-gray-700 font-medium">Filter by Status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          >
            <option value="all">All Statuses</option>
            {Object.values(TaskStatus).map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="p-6 bg-white rounded-lg shadow-md text-gray-600">No assigned tasks found for the current filter. Keep up the good work!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-400 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  <Link to={`/projects/${task.projectId}/tasks/${task.id}`} className="hover:underline text-blue-600">
                    {task.title}
                  </Link>
                </h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{task.description || 'No description.'}</p>
                <p className="text-sm text-gray-500 mb-2">Project: <Link to={`/projects/${task.projectId}`} className="hover:underline">{task.project.name}</Link></p>
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === TaskStatus.OPEN ? 'bg-red-100 text-red-800' :
                    task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                    task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === TaskPriority.HIGH ? 'bg-orange-100 text-orange-800' :
                    task.priority === TaskPriority.MEDIUM ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600 mt-4">
                {task.dueDate && (
                  <span>Due: {format(parseISO(task.dueDate), 'MMM dd, yyyy')}</span>
                )}
                <select
                  value={task.status}
                  onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-1"
                >
                  {Object.values(TaskStatus).map((status) => (
                    <option key={status} value={status}>{status.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedTasks;
```

#### `frontend/src/pages/Task/TaskDetail.tsx`
```typescript