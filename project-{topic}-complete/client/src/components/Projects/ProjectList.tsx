import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import { Project } from '../../types';
import ProjectCard from './ProjectCard';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import { useAuth } from '../../hooks/useAuth';

const ProjectList: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newProjectFormData, setNewProjectFormData] = useState({ name: '', description: '' });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Fetch all projects. Filtering can be added if required by current user permissions/context.
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch projects.');
      console.error('Project list fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleNewProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProjectFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', newProjectFormData);
      await fetchProjects(); // Re-fetch projects to update the list
      setIsCreateModalOpen(false);
      setNewProjectFormData({ name: '', description: '' }); // Reset form
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading projects...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">All Projects</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} primary>
          Create New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-600 text-lg">No projects found. Create the first one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateProjectSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Project Name
            </label>
            <Input
              type="text"
              id="name"
              name="name"
              value={newProjectFormData.name}
              onChange={handleNewProjectChange}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={newProjectFormData.description}
              onChange={handleNewProjectChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" secondary onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" primary>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectList;