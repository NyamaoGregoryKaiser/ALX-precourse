import React from 'react';
import { Link } from 'react-router-dom';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onTaskUpdate?: () => void; // Callback to refresh list after update
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link to={`/tasks/${task.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 flex flex-col h-full">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{task.title}</h3>
        <p className="text-gray-600 text-sm mb-3 flex-grow line-clamp-2">{task.description || 'No description.'}</p>

        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>

        <p className="text-gray-500 text-xs mb-1">
          Project: <span className="font-medium text-blue-600">{task.project.name}</span>
        </p>
        <p className="text-gray-500 text-xs mb-1">
          Assignee: {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
        </p>
        <p className="text-gray-500 text-xs">
          Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No Due Date'}
        </p>
      </div>
    </Link>
  );
};

export default TaskCard;