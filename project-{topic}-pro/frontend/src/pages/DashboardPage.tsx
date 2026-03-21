```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/api';
import { Project } from '../types';
import ProjectList from '../components/ProjectList';

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const fetchedProjects = await projectService.getProjects();
        setProjects(fetchedProjects);
      } catch (err: any) {
        console.error('Failed to fetch projects:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load projects.');
      } finally {
        setLoadingProjects(false);
      }
    };

    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await projectService.deleteProject(projectId);
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
      alert('Project deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete project:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to delete project.');
    }
  };


  if (isLoading) {
    return <p style={{ textAlign: 'center' }}>Loading user data...</p>;
  }

  if (!isAuthenticated || !user) {
    return null; // Should redirect to login via useEffect
  }

  return (
    <div style={{ maxWidth: '960px', margin: '20px auto', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Welcome, {user.username}!</h1>
      <p style={{ textAlign: 'center', color: '#555' }}>Your role: <strong style={{ color: '#007bff' }}>{user.role.toUpperCase()}</strong></p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
        <button onClick={() => navigate('/create-project')} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Create New Project</button>
        <button onClick={logout} style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {loadingProjects ? (
        <p style={{ textAlign: 'center' }}>Loading projects...</p>
      ) : (
        <ProjectList
          projects={projects}
          onDeleteProject={handleDeleteProject}
          userRole={user.role}
          currentUserId={user.id}
        />
      )}
    </div>
  );
};

export default DashboardPage;
```