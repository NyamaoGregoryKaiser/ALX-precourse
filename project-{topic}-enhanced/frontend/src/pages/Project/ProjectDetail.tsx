import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Project, Task, User, TaskStatus } from '../../types';
import { projectApi, taskApi, userApi } from '../../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import ProjectForm from '../../components/forms/ProjectForm';
import TaskForm from '../../components/forms/TaskForm';
import { format, parseISO } from 'date-fns';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectAndTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectRes, tasksRes, usersRes] = await Promise.all([
        projectApi.getProjectById(projectId),
        projectApi.getProjectTasks(projectId),
        userApi.getAllUsers(), // Fetch all users to assign tasks
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      setAssignableUsers(usersRes.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load project details';
      setError(message);
      toast.error(message);
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/projects'); // Redirect if no access or not found
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const handleUpdateProject = async (data: { name: string; description?: string }) => {
    if (!projectId) return;
    setSubmitLoading(true);
    try {
      const response = await projectApi.updateProject(projectId, data);
      setProject(response.data);
      toast.success('Project updated successfully!');
      setIsEditingProject(false);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update project';
      toast.error(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId || !window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    setSubmitLoading(true);
    try {
      await projectApi.deleteProject(projectId);
      toast.success('Project deleted successfully!');
      navigate('/projects');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to delete project';
      toast.error(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateTask = async (data: Parameters<typeof TaskForm>[0]['onSubmit'] extends (d: infer D) => any ? D : never) => {
    if (!projectId) return;
    setSubmitLoading(true);
    try {
      const response = await taskApi.createTask({ ...data, projectId });
      setTasks([...tasks, response.data]);
      toast.success('Task created successfully!');
      setIsCreatingTask(false);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create task';
      toast.error(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !project) {
    return <div className="p-6 text-center text-red-500">Error: {error || 'Project not found.'}</div>;
  }

  const isOwnerOrAdmin = authUser?.id === project.ownerId || authUser?.role === 'admin';

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800">{project.name}</h1>
        {isOwnerOrAdmin && (
          <div className="space-x-2">
            <button
              onClick={() => setIsEditingProject(!isEditingProject)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={submitLoading}
            >
              {isEditingProject ? 'Cancel Edit' : 'Edit Project'}
            </button>
            <button
              onClick={handleDeleteProject}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
              disabled={submitLoading}
            >
              Delete Project
            </button>
          </div>
        )}
      </div>

      {isEditingProject && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Edit Project</h2>
          <ProjectForm
            initialData={project}
            onSubmit={handleUpdateProject}
            isLoading={submitLoading}
            buttonText="Save Changes"
          />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Description</h2>
        <p className="text-gray-700">{project.description || 'No description provided.'}</p>
        <p className="text-sm text-gray-500 mt-4">Owner: {project.owner.firstName} {project.owner.lastName} ({project.owner.email})</p>
        <p className="text-sm text-gray-500">Created: {format(parseISO(project.createdAt), 'MMM dd, yyyy')}</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Tasks</h2>
        {isOwnerOrAdmin && (
          <button
            onClick={() => setIsCreatingTask(!isCreatingTask)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            disabled={submitLoading}
          >
            {isCreatingTask ? 'Cancel Add Task' : 'Add New Task'}
          </button>
        )}
      </div>

      {isCreatingTask && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Create New Task</h2>
          <TaskForm
            projectId={project.id}
            assignableUsers={assignableUsers}
            onSubmit={handleCreateTask}
            isLoading={submitLoading}
            buttonText="Create Task"
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="p-6 bg-white rounded-lg shadow-md text-gray-600">No tasks in this project yet. {isOwnerOrAdmin && 'Start by adding one!'}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-400">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                <Link to={`/projects/${project.id}/tasks/${task.id}`} className="hover:underline text-indigo-600">
                  {task.title}
                </Link>
              </h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{task.description || 'No description.'}</p>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.status === TaskStatus.OPEN ? 'bg-red-100 text-red-800' :
                  task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                  task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.status.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.priority === TaskPriority.HIGH ? 'bg-orange-100 text-orange-800' :
                  task.priority === TaskPriority.MEDIUM ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>
              {task.assignedTo && (
                <p className="text-sm text-gray-600">Assigned To: {task.assignedTo.firstName} {task.assignedTo.lastName}</p>
              )}
              {task.dueDate && (
                <p className="text-sm text-gray-600">Due: {format(parseISO(task.dueDate), 'MMM dd, yyyy')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
```

#### `frontend/src/pages/Project/ProjectList.tsx`
```typescript