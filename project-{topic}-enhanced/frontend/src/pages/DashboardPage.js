```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return; // Wait for user to be loaded from AuthContext

    const fetchProjects = async () => {
      try {
        setDataLoading(true);
        const response = await api.get('/projects');
        setProjects(response.data.data.projects);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setError(err.response?.data?.message || 'Failed to load projects.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  if (authLoading || dataLoading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Welcome, {user.name}!</h1>
      <p className="dashboard-subtitle">Your Role: {user.role}</p>

      <section className="dashboard-section">
        <h2 className="section-title">Your Projects</h2>
        {projects.length === 0 ? (
          <p className="no-data-message">You are not part of any projects yet.</p>
        ) : (
          <div className="project-list">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <h3><Link to={`/projects/${project.id}`}>{project.name}</Link></h3>
                <p>{project.description}</p>
                <div className="project-meta">
                  <span>Manager: {project.manager.name}</span>
                  <span>Status: {project.status}</span>
                  <span>Tasks: {project._count.tasks}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Additional sections can be added here, e.g., "Assigned Tasks", "Activity Feed" */}
    </div>
  );
};

export default DashboardPage;
```