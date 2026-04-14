import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link to={`/projects/${project.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 flex flex-col h-full">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{project.name}</h3>
        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">{project.description || 'No description provided.'}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ')}
          </span>
          <p className="text-gray-500 text-sm">
            Tasks: {project._count?.tasks ?? 0}
          </p>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Owner: {project.owner.firstName} {project.owner.lastName}
        </p>
      </div>
    </Link>
  );
};

export default ProjectCard;