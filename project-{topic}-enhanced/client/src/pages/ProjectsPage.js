import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const { user } = useAuth(); // To potentially filter projects or show owner info

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('/v1/projects');
        setProjects(response.data.results);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch projects.');
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/v1/projects', {
        title: newProjectTitle,
        description: newProjectDescription,
      });
      setProjects([...projects, response.data]);
      setNewProjectTitle('');
      setNewProjectDescription('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await axios.delete(`/v1/projects/${projectId}`);
      setProjects(projects.filter(project => project.id !== projectId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  if (loading) return <div className="text-center mt-8">Loading projects...</div>;
  if (error) return <div className="text-red-500 text-center mt-8">{error}</div>;

  return (
    <div className="mt-8">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">My Projects</h2>

      {/* Create New Project Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4">Create New Project</h3>
        <form onSubmit={handleCreateProject}>
          <div className="mb-4">
            <label htmlFor="projectTitle" className="block text-gray-700 text-sm font-bold mb-2">Title</label>
            <input
              type="text"
              id="projectTitle"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="projectDescription" className="block text-gray-700 text-sm font-bold mb-2">Description</label>
            <textarea
              id="projectDescription"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Project
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-600">No projects found. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
              <p className="text-gray-600 mb-4">{project.description}</p>
              <p className="text-sm text-gray-500 mb-2">Status: <span className={`font-medium ${project.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{project.status.replace('_', ' ')}</span></p>
              <div className="flex justify-end space-x-2 mt-4">
                <Link to={`/projects/${project.id}/tasks`} className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded">View Tasks</Link>
                {/* Only owner or admin can delete */}
                {(user.id === project.ownerId || user.role === 'admin') && (
                  <button
                    onClick={() => handleDeleteProject(project.id)}
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

export default ProjectsPage;