import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TasksPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { user } = useAuth(); // For showing assignee info or controlling task creation

  useEffect(() => {
    const fetchProjectAndTasks = async () => {
      try {
        const projectResponse = await axios.get(`/v1/projects/${projectId}`);
        setProject(projectResponse.data);

        const tasksResponse = await axios.get(`/v1/tasks?projectId=${projectId}`);
        setTasks(tasksResponse.data.results);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch project and tasks.');
        setLoading(false);
      }
    };
    fetchProjectAndTasks();
  }, [projectId]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/v1/tasks', {
        title: newTaskTitle,
        projectId,
        status: 'to_do',
        priority: 'medium',
      });
      setTasks([...tasks, response.data]);
      setNewTaskTitle('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`/v1/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };


  if (loading) return <div className="text-center mt-8">Loading tasks...</div>;
  if (error) return <div className="text-red-500 text-center mt-8">{error}</div>;
  if (!project) return <div className="text-center mt-8">Project not found.</div>;


  return (
    <div className="mt-8">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Tasks for "{project.title}"</h2>

      {/* Create New Task Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4">Create New Task</h3>
        <form onSubmit={handleCreateTask}>
          <div className="mb-4">
            <label htmlFor="taskTitle" className="block text-gray-700 text-sm font-bold mb-2">Task Title</label>
            <input
              type="text"
              id="taskTitle"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Task
          </button>
        </form>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-600">No tasks found for this project. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
              <p className="text-gray-600 mb-4">{task.description || 'No description'}</p>
              <p className="text-sm text-gray-500 mb-2">Status: <span className={`font-medium ${task.status === 'done' ? 'text-green-600' : 'text-yellow-600'}`}>{task.status.replace('_', ' ')}</span></p>
              <p className="text-sm text-gray-500 mb-2">Priority: <span className={`font-medium ${task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'}`}>{task.priority}</span></p>
              {task.dueDate && <p className="text-sm text-gray-500 mb-2">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
              {/* Add task actions like update/delete for authorized users */}
              <div className="flex justify-end space-x-2 mt-4">
                {(user.id === project.ownerId || user.role === 'admin' || user.id === task.assignedTo) && ( // Example: Task assignee, project owner, or admin can delete
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksPage;