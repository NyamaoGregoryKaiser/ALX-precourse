```typescript
import React from 'react';
import { Project } from '../types';
import { Link } from 'react-router-dom';

interface ProjectListProps {
  projects: Project[];
  onDeleteProject: (projectId: string) => void;
  userRole: string;
  currentUserId: string;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onDeleteProject, userRole, currentUserId }) => {
  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Projects</h2>
      {projects.length === 0 ? (
        <p>No projects available.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {projects.map((project) => (
            <li key={project.id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: '#007bff', fontSize: '1.1em', fontWeight: 'bold' }}>
                  {project.name}
                </Link>
                <p style={{ margin: '5px 0 0', color: '#666' }}>Status: {project.status}</p>
                <p style={{ margin: '0', color: '#666' }}>Owner: {project.owner?.username || 'N/A'}</p>
              </div>
              <div>
                {(userRole === 'admin' || project.ownerId === currentUserId) && (
                  <button
                    onClick={() => onDeleteProject(project.id)}
                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                )}
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