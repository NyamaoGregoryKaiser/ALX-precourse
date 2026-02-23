```javascript
// A conceptual ProjectContext, for demonstration.
// For a large app, you might have separate contexts for different domain areas,
// or a global state manager (e.g., Redux, Zustand) for more complex scenarios.
// For this example, direct API calls in pages/components are often simpler.

import React, { createContext, useState, useEffect, useContext } from 'react';
import projectService from '../services/projectService';
import { AuthContext } from './AuthContext';

export const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProjects();
    }
  }, [user, authLoading]);

  const addProject = async (projectData) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects((prevProjects) => [...prevProjects, newProject]);
      return newProject;
    } catch (err) {
      console.error('Failed to add project:', err);
      throw err;
    }
  };

  const updateProject = async (projectId, updateData) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, updateData);
      setProjects((prevProjects) =>
        prevProjects.map((p) => (p._id === projectId ? updatedProject : p))
      );
      return updatedProject;
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      setProjects((prevProjects) => prevProjects.filter((p) => p._id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        error,
        fetchProjects,
        addProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
```