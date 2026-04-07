import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function HomePage({ isAuthenticated, user }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/projects');
        setProjects(response.data.results);
      } catch (err) {
        setError('Failed to fetch projects. Please try again.');
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated, navigate]);

  if (loading) {
    return <div className="container">Loading projects...</div>;
  }

  if (error) {
    return <div className="container error-message">{error}</div>;
  }

  return (
    <div className="container">
      <h2>Welcome, {user?.name}!</h2>
      <h3>Your Projects</h3>
      {projects.length === 0 ? (
        <p>No projects found. Create one to get started!</p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id} className="project-item">
              <h3>{project.name}</h3>
              <p><span>Status:</span> {project.status}</p>
              <p><span>Description:</span> {project.description}</p>
              <p><span>Created By:</span> {project.creator?.name || 'Unknown'}</p>
              {project.startDate && <p><span>Start Date:</span> {new Date(project.startDate).toLocaleDateString()}</p>}
              {project.endDate && <p><span>End Date:</span> {new Date(project.endDate).toLocaleDateString()}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default HomePage;