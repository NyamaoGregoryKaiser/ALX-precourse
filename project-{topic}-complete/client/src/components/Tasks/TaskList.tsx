import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import { Task } from '../../types';
import TaskCard from './TaskCard';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks'); // Fetch all tasks
      setTasks(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tasks.');
      console.error('Task list fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">All Tasks</h1>

      {tasks.length === 0 ? (
        <p className="text-gray-600 text-lg text-center">No tasks found. Create a project and add some tasks!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onTaskUpdate={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;