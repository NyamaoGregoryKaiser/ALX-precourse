import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Project } from '../../types';
import { projectApi } from '../../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProjectForm from '../../components/forms/ProjectForm';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await projectApi.getAllProjects();
      setProjects(response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load projects';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (data: { name: string; description?: string }) => {
    setSubmitLoading(true);
    try {
      const response = await projectApi.createProject(data);
      setProjects([...projects, response.data]);
      toast.success('Project created successfully!');
      setIsCreatingProject(false);
      navigate(`/projects/${response.data.id}`); // Navigate to new project
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create project';
      toast.error(message);
    } finally {
      setSubmitLoading(false);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800">Your Projects</h1>
        <button
          onClick={() => setIsCreatingProject(!isCreatingProject)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          disabled={submitLoading}
        >
          {isCreatingProject ? 'Cancel' : 'Create New Project'}
        </button>
      </div>

      {isCreatingProject && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">New Project</h2>
          <ProjectForm
            onSubmit={handleCreateProject}
            isLoading={submitLoading}
            buttonText="Create Project"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <p className="p-6 bg-white rounded-lg shadow-md text-gray-600">
          No projects found. {user?.role === 'user' ? 'Start by creating your first project!' : 'As an admin, you can view all projects or create a new one.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                <Link to={`/projects/${project.id}`} className="hover:underline text-indigo-600">
                  {project.name}
                </Link>
              </h2>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description || 'No description provided.'}</p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Owner: {project.owner.firstName} {project.owner.lastName}</span>
                <span>Created: {format(parseISO(project.createdAt), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;
```

#### `frontend/src/pages/Task/AssignedTasks.tsx`
```typescript