import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Project, Task } from '../../types';
import TaskCard from '../Tasks/TaskCard';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import { useAuth } from '../../hooks/useAuth';

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', status: '' });
  const [newTaskFormData, setNewTaskFormData] = useState({ title: '', description: '', assigneeId: '', dueDate: '' });
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const isOwnerOrAdmin = user && project && (user.id === project.owner.id || user.role === 'ADMIN');

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data);
      setEditFormData({
        name: res.data.name,
        description: res.data.description || '',
        status: res.data.status,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch project details.');
      console.error('Project details fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })));
    } catch (err: any) {
      console.error('Failed to fetch users for task assignment:', err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchUsers();
  }, [projectId]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/projects/${projectId}`, editFormData);
      await fetchProjectDetails(); // Re-fetch to show updated data
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project.');
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project and all its tasks?')) {
      try {
        await api.delete(`/projects/${projectId}`);
        navigate('/projects');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete project.');
      }
    }
  };

  const handleNewTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTaskFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTaskFormData,
        projectId: projectId,
        assigneeId: newTaskFormData.assigneeId || undefined, // Send as undefined if empty string
        dueDate: newTaskFormData.dueDate ? new Date(newTaskFormData.dueDate).toISOString() : undefined,
      };
      await api.post('/tasks', taskData);
      await fetchProjectDetails(); // Re-fetch to update task list
      setIsAddTaskModalOpen(false);
      setNewTaskFormData({ title: '', description: '', assigneeId: '', dueDate: '' }); // Reset form
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading project details...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (!project) {
    return <div className="text-center py-8 text-gray-600">Project not found.</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
          {isOwnerOrAdmin && (
            <div className="space-x-2">
              <Button onClick={() => setIsEditModalOpen(true)} secondary>
                Edit Project
              </Button>
              <Button onClick={handleDeleteProject} danger>
                Delete Project
              </Button>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-lg mb-4">{project.description || 'No description provided.'}</p>
        <div className="flex items-center space-x-4 mb-6">
          <span className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
            Status: {project.status.replace('_', ' ')}
          </span>
          <p className="text-gray-600">
            Owner: {project.owner.firstName} {project.owner.lastName} ({project.owner.email})
          </p>
        </div>

        <hr className="my-8" />

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Tasks ({project.tasks?.length || 0})</h2>
          {isOwnerOrAdmin && (
            <Button onClick={() => setIsAddTaskModalOpen(true)} primary>
              Add New Task
            </Button>
          )}
        </div>

        {project.tasks && project.tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onTaskUpdate={fetchProjectDetails} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No tasks in this project yet. {isOwnerOrAdmin && "Click 'Add New Task' to create one."}</p>
        )}
      </div>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Project">
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Project Name</label>
            <Input
              type="text"
              name="name"
              value={editFormData.name}
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
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
            <select
              name="status"
              value={editFormData.status}
              onChange={handleEditChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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

      {/* Add Task Modal */}
      <Modal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} title="Add New Task">
        <form onSubmit={handleNewTaskSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Task Title</label>
            <Input
              type="text"
              name="title"
              value={newTaskFormData.title}
              onChange={handleNewTaskChange}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Description (Optional)</label>
            <textarea
              name="description"
              value={newTaskFormData.description}
              onChange={handleNewTaskChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            ></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Assignee (Optional)</label>
            <select
              name="assigneeId"
              value={newTaskFormData.assigneeId}
              onChange={handleNewTaskChange}
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
            <label className="block text-gray-700 text-sm font-bold mb-2">Due Date (Optional)</label>
            <Input
              type="date"
              name="dueDate"
              value={newTaskFormData.dueDate}
              onChange={handleNewTaskChange}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" secondary onClick={() => setIsAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" primary>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectDetails;