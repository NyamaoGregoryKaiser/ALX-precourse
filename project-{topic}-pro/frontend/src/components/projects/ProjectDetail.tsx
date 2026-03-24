```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsService } from '../../services/projects.service';
import { tasksService } from '../../services/tasks.service';
import { Project, Task, CreateTaskData, TaskStatus, TaskPriority } from '../../types'; // Ensure TaskStatus/Priority are defined
import { useAuth } from '../../hooks/useAuth';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // To check if current user is owner
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState('');
  const [editedProjectDescription, setEditedProjectDescription] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const isOwner = user && project && user.id === project.owner.id;

  useEffect(() => {
    if (projectId) {
      fetchProjectAndTasks(projectId);
    }
  }, [projectId]);

  const fetchProjectAndTasks = async (id: string) => {
    try {
      setLoading(true);
      const projectData = await projectsService.getProjectById(id);
      setProject(projectData);
      setEditedProjectName(projectData.name);
      setEditedProjectDescription(projectData.description || '');

      const tasksData = await tasksService.getTasksByProject(id);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch project details.');
      if (err.response?.status === 403) {
        navigate('/projects'); // Redirect if no permission
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    setError(null);
    if (!project) return;
    try {
      await projectsService.updateProject(project.id, {
        name: editedProjectName,
        description: editedProjectDescription,
      });
      setIsEditingProject(false);
      await fetchProjectAndTasks(project.id); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projectId || !newTaskTitle.trim()) {
      setError('Task title cannot be empty.');
      return;
    }

    try {
      setIsCreatingTask(true);
      const taskData: CreateTaskData = {
        title: newTaskTitle,
        description: newTaskDescription,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
        priority: newTaskPriority,
      };
      await tasksService.createTask(projectId, taskData);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskPriority(TaskPriority.MEDIUM);
      await fetchProjectAndTasks(projectId); // Refresh tasks
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    setError(null);
    if (!projectId) return;
    try {
      await tasksService.deleteTask(projectId, taskId);
      await fetchProjectAndTasks(projectId); // Refresh tasks
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };


  if (loading) return <div className="text-center mt-8">Loading project details...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  if (!project) return <div className="text-center mt-8">Project not found.</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Project: {project.name}</h1>
        {isOwner && (
          <button
            onClick={() => setIsEditingProject(!isEditingProject)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md text-sm"
          >
            {isEditingProject ? 'Cancel Edit' : 'Edit Project'}
          </button>
        )}
      </div>

      {isEditingProject && isOwner ? (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-3">Edit Project Details</h2>
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
            <input
              type="text"
              value={editedProjectName}
              onChange={(e) => setEditedProjectName(e.target.value)}
              className="border rounded-md p-2 w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
            <textarea
              value={editedProjectDescription}
              onChange={(e) => setEditedProjectDescription(e.target.value)}
              className="border rounded-md p-2 w-full h-24"
            ></textarea>
          </div>
          <button
            onClick={handleUpdateProject}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mr-2"
          >
            Save Changes
          </button>
          <button
            onClick={() => setIsEditingProject(false)}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-gray-700"><strong>Description:</strong> {project.description || 'N/A'}</p>
          <p className="text-gray-700"><strong>Owner:</strong> {project.owner.firstName} {project.owner.lastName}</p>
          <p className="text-gray-500 text-sm">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
        </div>
      )}


      <h2 className="text-2xl font-bold mb-4 text-gray-800">Tasks</h2>

      {isOwner && ( // Only owner can create tasks
        <form onSubmit={handleCreateTask} className="mb-8 p-4 bg-white rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="newTaskTitle" className="block text-gray-700 text-sm font-bold mb-1">Title:</label>
              <input
                type="text"
                id="newTaskTitle"
                placeholder="Task Title"
                className="border rounded-md p-2 w-full"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newTaskDueDate" className="block text-gray-700 text-sm font-bold mb-1">Due Date (Optional):</label>
              <input
                type="date"
                id="newTaskDueDate"
                className="border rounded-md p-2 w-full"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="newTaskDescription" className="block text-gray-700 text-sm font-bold mb-1">Description (Optional):</label>
            <textarea
              id="newTaskDescription"
              placeholder="Task Description"
              className="border rounded-md p-2 w-full h-20"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="newTaskPriority" className="block text-gray-700 text-sm font-bold mb-1">Priority:</label>
            <select
              id="newTaskPriority"
              className="border rounded-md p-2 w-full"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
            >
              {Object.values(TaskPriority).map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
            disabled={isCreatingTask}
          >
            {isCreatingTask ? 'Creating...' : 'Add Task'}
          </button>
        </form>
      )}


      {tasks.length === 0 ? (
        <p className="text-gray-600">No tasks found for this project.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <li key={task.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between">
              <div>
                <Link to={`/projects/${projectId}/tasks/${task.id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                  {task.title}
                </Link>
                <p className="text-gray-600 text-sm mt-1">Status: <span className={`font-medium ${task.status === TaskStatus.DONE ? 'text-green-600' : task.status === TaskStatus.OPEN ? 'text-blue-600' : 'text-yellow-600'}`}>{task.status}</span></p>
                <p className="text-gray-600 text-sm">Priority: <span className={`font-medium ${task.priority === TaskPriority.CRITICAL ? 'text-red-600' : task.priority === TaskPriority.HIGH ? 'text-orange-600' : 'text-gray-600'}`}>{task.priority}</span></p>
                {task.dueDate && <p className="text-gray-600 text-sm">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                {task.assignee && <p className="text-gray-600 text-sm">Assignee: {task.assignee.firstName} {task.assignee.lastName}</p>}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-md text-sm"
                >
                  Details
                </button>
                {(isOwner || user?.id === task.creator.id) && ( // Only owner or creator can delete task
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm"
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

export default ProjectDetail;
```