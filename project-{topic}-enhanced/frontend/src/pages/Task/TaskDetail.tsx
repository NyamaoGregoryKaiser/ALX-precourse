import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Task, User, TaskStatus, TaskPriority } from '../../types';
import { taskApi, userApi } from '../../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import TaskForm from '../../components/forms/TaskForm';
import { format, parseISO } from 'date-fns';

const TaskDetail: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskAndUsers = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, usersRes] = await Promise.all([
        taskApi.getTaskById(taskId),
        userApi.getAllUsers(),
      ]);
      setTask(taskRes.data);
      setAssignableUsers(usersRes.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load task details';
      setError(message);
      toast.error(message);
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate(projectId ? `/projects/${projectId}` : '/'); // Redirect if no access or not found
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskAndUsers();
  }, [taskId]);

  const handleUpdateTask = async (data: Parameters<typeof TaskForm>[0]['onSubmit'] extends (d: infer D) => any ? D : never) => {
    if (!taskId) return;
    setSubmitLoading(true);
    try {
      const response = await taskApi.updateTask(taskId, data);
      setTask(response.data);
      toast.success('Task updated successfully!');
      setIsEditingTask(false);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update task';
      toast.error(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId || !window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    setSubmitLoading(true);
    try {
      await taskApi.deleteTask(taskId);
      toast.success('Task deleted successfully!');
      navigate(projectId ? `/projects/${projectId}` : '/');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to delete task';
      toast.error(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !task) {
    return <div className="p-6 text-center text-red-500">Error: {error || 'Task not found.'}</div>;
  }

  // Determine if the current user has permissions to edit/delete the task
  // Only project owner or admin can delete. Project owner, assigned user, or admin can update.
  const isProjectOwner = authUser?.id === task.project.ownerId;
  const isAssignedToUser = authUser?.id === task.assignedToId;
  const isAdmin = authUser?.role === 'admin';
  const canEdit = isProjectOwner || isAssignedToUser || isAdmin;
  const canDelete = isProjectOwner || isAdmin;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800">Task: {task.title}</h1>
        {canEdit && (
          <div className="space-x-2">
            <button
              onClick={() => setIsEditingTask(!isEditingTask)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={submitLoading}
            >
              {isEditingTask ? 'Cancel Edit' : 'Edit Task'}
            </button>
            {canDelete && (
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                disabled={submitLoading}
              >
                Delete Task
              </button>
            )}
          </div>
        )}
      </div>

      {isEditingTask && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Edit Task</h2>
          <TaskForm
            initialData={task}
            projectId={task.projectId}
            assignableUsers={assignableUsers}
            onSubmit={handleUpdateTask}
            isLoading={submitLoading}
            buttonText="Save Changes"
            isEditMode={true}
          />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Details</h2>
        <p className="text-gray-700 mb-4">{task.description || 'No description provided.'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
          <p><strong>Project:</strong> <Link to={`/projects/${task.projectId}`} className="text-indigo-600 hover:underline">{task.project.name}</Link></p>
          <p><strong>Assigned To:</strong> {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned'}</p>
          <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-sm font-medium ${
            task.status === TaskStatus.OPEN ? 'bg-red-100 text-red-800' :
            task.status === TaskStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
            task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>{task.status.replace(/_/g, ' ').toUpperCase()}</span></p>
          <p><strong>Priority:</strong> <span className={`px-2 py-1 rounded-full text-sm font-medium ${
            task.priority === TaskPriority.HIGH ? 'bg-orange-100 text-orange-800' :
            task.priority === TaskPriority.MEDIUM ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>{task.priority.toUpperCase()}</span></p>
          <p><strong>Due Date:</strong> {task.dueDate ? format(parseISO(task.dueDate), 'MMM dd, yyyy') : 'N/A'}</p>
          <p><strong>Created At:</strong> {format(parseISO(task.createdAt), 'MMM dd, yyyy HH:mm')}</p>
          <p><strong>Last Updated:</strong> {format(parseISO(task.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
```

#### `frontend/src/pages/Admin/AdminDashboard.tsx`
```typescript