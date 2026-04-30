```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTasks, createTask, updateTask, deleteTask, Task } from '../api/tasks';
import TaskForm from '../components/TaskForm';

const TasksPage: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'pending', 'in-progress', 'completed'

  const getTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTasks(token, filterStatus === 'all' ? undefined : filterStatus);
      if (response.success && response.tasks) {
        setTasks(response.tasks);
      } else {
        setError(response.message || 'Failed to fetch tasks.');
      }
    } catch (err) {
      setError('An unexpected error occurred while fetching tasks.');
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      getTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [isAuthenticated, getTasks]);

  const handleCreateOrUpdateTask = async (taskData: Partial<Task>) => {
    if (!token) return;
    setFormSubmitting(true);
    try {
      let response;
      if (editingTask) {
        response = await updateTask(token, editingTask.id, taskData);
      } else {
        response = await createTask(token, taskData);
      }

      if (response.success) {
        setShowForm(false);
        setEditingTask(null);
        getTasks(); // Refresh tasks list
      } else {
        setError(response.message || 'Failed to save task.');
      }
    } catch (err) {
      setError('An unexpected error occurred while saving task.');
      console.error('Save task error:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token || !window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const response = await deleteTask(token, taskId);
      if (response.success) {
        getTasks(); // Refresh tasks list
      } else {
        setError(response.message || 'Failed to delete task.');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting task.');
      console.error('Delete task error:', err);
    }
  };

  const openCreateForm = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="text-center text-lg mt-8">Loading tasks...</div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-8" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Tasks</h1>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <label htmlFor="statusFilter" className="block text-gray-700 text-sm font-bold mr-2">
            Filter by Status:
          </label>
          <select
            id="statusFilter"
            className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          Add New Task
        </button>
      </div>

      {showForm && (
        <TaskForm
          initialTask={editingTask}
          onSubmit={handleCreateOrUpdateTask}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
            setError(null);
          }}
          isSubmitting={formSubmitting}
        />
      )}

      {tasks.length === 0 ? (
        <p className="text-gray-600 text-lg mt-10 text-center">No tasks found. Start by adding a new task!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between border border-gray-200 hover:border-blue-400 transition duration-300">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                <p className="text-gray-700 mb-4">{task.description || 'No description'}</p>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>
                    Status:{' '}
                    <span
                      className={`font-medium px-2 py-1 rounded-full text-xs ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                  </span>
                  <span>
                    Due:{' '}
                    <span className="font-medium">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => openEditForm(task)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition duration-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition duration-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksPage;
```