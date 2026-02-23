```javascript
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import projectService from '../services/projectService';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import CreateProjectModal from '../components/projects/CreateProjectModal'; // We'll create this component
import EditProjectModal from '../components/projects/EditProjectModal'; // We'll create this component
import { AuthContext } from '../contexts/AuthContext';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const { user } = useContext(AuthContext);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err.response?.data?.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (projectData) => {
    try {
      await projectService.createProject(projectData);
      fetchProjects(); // Refresh the list
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating project:', err);
      throw err; // Re-throw to be caught by the modal form
    }
  };

  const handleUpdateProject = async (projectId, updateData) => {
    try {
      await projectService.updateProject(projectId, updateData);
      fetchProjects(); // Refresh the list
      setIsEditModalOpen(false);
      setSelectedProject(null);
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project and all its tasks?')) {
      try {
        await projectService.deleteProject(projectId);
        fetchProjects(); // Refresh the list
      } catch (err) {
        console.error('Error deleting project:', err);
        setError(err.response?.data?.message || 'Failed to delete project.');
      }
    }
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 text-lg">No projects found.
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button onClick={() => setIsCreateModalOpen(true)} className="text-primary hover:underline ml-1">
              Create the first one!
            </button>
          )}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link to={`/projects/${project._id}`} className="text-primary hover:underline">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.owner ? project.owner.username : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'}`
                      }>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(project.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {(user?.role === 'admin' || project.owner._id === user?.id) && (
                      <>
                        <button onClick={() => openEditModal(project)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                          <PencilIcon className="h-5 w-5 inline" />
                        </button>
                        <button onClick={() => handleDeleteProject(project._id)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-5 w-5 inline" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <CreateProjectModal onCreate={handleCreateProject} onCancel={() => setIsCreateModalOpen(false)} />
      </Modal>

      {selectedProject && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Project: ${selectedProject.name}`}
        >
          <EditProjectModal project={selectedProject} onUpdate={handleUpdateProject} onCancel={() => setIsEditModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
}

export default ProjectsPage;
```