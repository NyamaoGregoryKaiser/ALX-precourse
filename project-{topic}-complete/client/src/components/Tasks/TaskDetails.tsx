import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import { Task, User, TaskPriority, TaskStatus } from '../../types';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import { format, isValid } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

const TaskDetails: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    assigneeId: '',
    dueDate: '',
  });
  const [users, setUsers] = useState<Pick<User, 'id' | 'firstName' | 'lastName'>[]>([]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/${taskId}`);
      const fetchedTask: Task = res.data;
      setTask(fetchedTask);
      setEditFormData({
        title: fetchedTask.title,
        description: fetchedTask.description || '',
        status: fetchedTask.status,
        priority: fetchedTask.priority,
        assigneeId: fetchedTask.assignee?.id || '',
        dueDate: fetchedTask.dueDate ? format(new Date(fetchedTask.dueDate), 'yyyy-MM-dd') : '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch task details.');
      console.error('Task details fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })));
    } catch (err: any) {
      console.error('Failed to fetch users for assignment:', err);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    fetchUsers();
  }, [taskId]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedData: any = { ...editFormData };
      if (updatedData.dueDate) {
        updatedData.dueDate = new Date(updatedData.dueDate).toISOString();
      } else {
        updatedData.dueDate = null; // Send null if cleared
      }
      if (updatedData.assigneeId === '') {
        updatedData.assigneeId = null; // Send null if unassigned
      }

      await api.patch(`/tasks/${taskId}`, updatedData);
      await fetchTaskDetails();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task.');
    }
  };

  const handleDeleteTask = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        navigate(`/projects/${task?.project.id}`); // Navigate back to project details
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete task.');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading task details...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (!task) {
    return <div className="text-center py-8 text-gray-600">Task not found.</div>;
  }

  const isAuthorizedToEdit = user && (
    user.id === task.reporter.id ||
    user.id === task.assignee?.id ||
    user.id === task.project.owner.id ||
    user.role === 'ADMIN'
  );

  const isAuthorizedToDelete = user && (
    user.id === task.reporter.id ||
    user.id === task.project.owner.id ||
    user.role === 'ADMIN'
  );

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{task.title}</h1>
          {isAuthorizedToEdit && (
            <div className="space-x-2">
              <Button onClick={() => setIsEditModalOpen(true)} secondary>
                Edit Task
              </Button>
              {isAuthorizedToDelete && (
                <Button onClick={handleDeleteTask} danger>
                  Delete Task
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-gray-600 text-lg mb-4">{task.description || 'No description provided.'}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-6">
          <div>
            <p className="font-semibold">Project:</p>
            <Link to={`/projects/${task.project.id}`} className="text-blue-600 hover:underline">
              {task.project.name}
            </Link>
          </div>
          <div>
            <p className="font-semibold">Status:</p>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <p className="font-semibold">Priority:</p>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          <div>
            <p className="font-semibold">Assignee:</p>
            {task.assignee ? (
              <span>{task.assignee.firstName} {task.assignee.lastName}</span>
            ) : (
              <span className="text-gray-500">Unassigned</span>
            )}
          </div>
          <div>
            <p className="font-semibold">Reporter:</p>
            <span>{task.reporter.firstName} {task.reporter.lastName}</span>
          </div>
          <div>
            <p className="font-semibold">Due Date:</p>
            <span>
              {task.dueDate && isValid(new Date(task.dueDate))
                ? format(new Date(task.dueDate), 'MMM dd, yyyy')
                : 'Not set'}
            </span>
          </div>
          <div>
            <p className="font-semibold">Created At:</p>
            <span>{format(new Date(task.createdAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          <div>
            <p className="font-semibold">Last Updated:</p>
            <span>{format(new Date(task.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Task">
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Task Title</label>
            <Input
              type="text"
              name="title"
              value={editFormData.title}
              onChange={handleEditChange}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
            <textarea
              name="description"
              value={editFormData.description}
              onChange={handleEditChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            ></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
              <select
                name="status"
                value={editFormData.status}
                onChange={handleEditChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Priority</label>
              <select
                name="priority"
                value={editFormData.priority}
                onChange={handleEditChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Assignee</label>
            <select
              name="assigneeId"
              value={editFormData.assigneeId}
              onChange={handleEditChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Due Date</label>
            <Input
              type="date"
              name="dueDate"
              value={editFormData.dueDate}
              onChange={handleEditChange}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" secondary onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" primary>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TaskDetails;