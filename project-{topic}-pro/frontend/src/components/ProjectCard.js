import React from 'react';
import { Link } from 'react-router-dom';
import Card from './Card';
import { PencilSquareIcon, TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{project.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{project.description || 'No description provided.'}</p>
        <p className="text-xs text-gray-500">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        <Link
          to={`/projects/${project.id}`}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
        >
          View Details
        </Link>
        <Link
          to={`/projects/${project.id}/new-ml-task`}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors duration-200"
        >
          <PlusCircleIcon className="h-4 w-4" />
          <span>New Task</span>
        </Link>
        <button
          onClick={() => onEdit(project)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors duration-200"
        >
          <PencilSquareIcon className="h-4 w-4" />
          <span>Edit</span>
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors duration-200"
        >
          <TrashIcon className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>
    </Card>
  );
};

export default ProjectCard;