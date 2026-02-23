```javascript
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import projectService from '../services/projectService';
import taskService from '../services/taskService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AuthContext } from '../contexts/AuthContext';
import { PlusIcon, UserPlusIcon, XMarkIcon, FolderIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import Modal from '../components/common/Modal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskList from '../components/tasks/TaskList';
import AddMemberModal from '../components/projects/AddMemberModal';

function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useContext(AuthContext);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const fetchProjectAndTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectData = await projectService.getProjectById(projectId);
      setProject(projectData);

      const tasksData = await taskService.getTasksByProjectId(projectId);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to fetch project or tasks:', err);
      setError(err.response?.data?.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const handleCreateTask = async (taskData) => {
    try {
      await taskService.createTask(projectId, taskData);
      fetchProjectAndTasks(); // Refresh list
      setIsCreateTaskModalOpen(false);
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const handleUpdateTask = async (taskId, updateData) => {
    try {
      await taskService.updateTask(taskId, updateData);
      fetchProjectAndTasks(); // Refresh list
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        fetchProjectAndTasks(); // Refresh list
      } catch (err) {
        console.error('Error deleting task:', err);
        setError(err.response?.data?.message || 'Failed to delete task.');
      }
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      await projectService.addProjectMember(projectId, memberData.userId, memberData.role);
      fetchProjectAndTasks(); // Refresh project details to show new member
      setIsAddMemberModalOpen(false);
    } catch (err) {
      console.error('Error adding member:', err);
      throw err;
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member? Their tasks will be unassigned.')) {
      try {
        await projectService.removeProjectMember(projectId, memberId);
        fetchProjectAndTasks(); // Refresh project details
      } catch (err) {
        console.error('Error removing member:', err);
        setError(err.response?.data?.message || 'Failed to remove member.');
      }
    }
  };

  const isOwnerOrAdmin = user?.role === 'admin' || project?.owner?._id === user?.id;
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const canModifyProject = isOwnerOrAdmin;
  const canAddRemoveMembers = isOwnerOrAdmin;
  const canCreateTask = isManagerOrAdmin || project?.members.some(m => m.user._id === user?.id); // Any project member

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (!project) {
    return <div className="text-gray-600 text-center py-8">Project not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Project Header */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FolderIcon className="h-7 w-7 text-primary mr-2" />
              {project.name}
            </h1>
            <p className="text-gray-600 mt-2">{project.description}</p>
          </div>
          {/* Add project edit/delete buttons here if needed */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <p><strong>Owner:</strong> {project.owner?.username} ({project.owner?.email})</p>
            <p><strong>Status:</strong> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
              ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'}`
              }>
              {project.status}
            </span></p>
          </div>
          <div>
            <p><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
            {project.endDate && <p><strong>End Date:</strong> {new Date(project.endDate).toLocaleDateString()}</p>}
            <p><strong>Created:</strong> {new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Project Members Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <UserPlusIcon className="h-5 w-5 text-primary mr-2" />
            Project Members
          </h2>
          {canAddRemoveMembers && (
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Member
            </button>
          )}
        </div>
        <ul className="divide-y divide-gray-200">
          {project.members.map((member) => (
            <li key={member.user._id} className="py-3 flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{member.user.username}</span>
                <span className="text-xs text-gray-500">({member.user.email})</span>
                <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${member.user._id === project.owner._id ? 'bg-blue-100 text-blue-800' :
                    member.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'}`
                  }>
                  {member.user._id === project.owner._id ? 'Owner' : member.role}
                </span>
              </div>
              {canAddRemoveMembers && member.user._id !== project.owner._id && (
                <button
                  onClick={() => handleRemoveMember(member.user._id)}
                  className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                  title="Remove Member"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Project Tasks Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ClipboardDocumentListIcon className="h-5 w-5 text-primary mr-2" />
            Tasks
          </h2>
          {canCreateTask && (
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              New Task
            </button>
          )}
        </div>
        <TaskList
          tasks={tasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          projectMembers={project.members.map(m => m.user)} // Pass only user objects
          currentProjectOwnerId={project.owner._id}
        />
      </div>

      {/* Modals */}
      <Modal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        title="Create New Task"
        size="lg"
      >
        <CreateTaskModal
          projectId={projectId}
          projectMembers={project.members.map(m => m.user)} // Pass available project members
          onCreate={handleCreateTask}
          onCancel={() => setIsCreateTaskModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Add Project Member"
      >
        <AddMemberModal
          projectId={projectId}
          currentMembers={project.members.map(m => m.user)}
          onAdd={handleAddMember}
          onCancel={() => setIsAddMemberModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default ProjectDetailPage;
```