```typescript
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsService } from '../../services/projects.service';
import { Project, CreateProjectData } from '../../types';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsService.getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newProjectName.trim()) {
      setError('Project name cannot be empty.');
      return;
    }

    try {
      setIsCreating(true);
      const projectData: CreateProjectData = { name: newProjectName };
      await projectsService.createProject(projectData);
      setNewProjectName(''); // Clear input
      await fetchProjects(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project and all its tasks?')) {
      return;
    }
    setError(null);
    try {
      await projectsService.deleteProject(projectId);
      await fetchProjects(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  if (loading) return <div className="text-center mt-8">Loading projects...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Projects</h1>

      <form onSubmit={handleCreateProject} className="mb-8 p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3">Create New Project</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Project Name"
            className="flex-grow border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Add Project'}
          </button>
        </div>
      </form>

      {projects.length === 0 ? (
        <p className="text-gray-600">No projects found. Start by creating a new one!</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <li key={project.id} className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between">
              <div>
                <Link to={`/projects/${project.id}`} className="text-xl font-semibold text-blue-600 hover:underline">
                  {project.name}
                </Link>
                <p className="text-gray-600 text-sm mt-1">{project.description || 'No description provided.'}</p>
                <p className="text-gray-500 text-xs mt-2">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-md text-sm"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProjectList;
```