```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksService } from '../../services/tasks.service';
import { usersService } from '../../services/users.service'; // Need to fetch users for assignee dropdown
import { Task, Comment, CreateCommentData, UpdateTaskData, TaskStatus, TaskPriority, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const TaskDetail: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Current authenticated user

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]); // For assignee dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState<TaskStatus>(TaskStatus.OPEN);
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [editedDueDate, setEditedDueDate] = useState('');
  const [editedAssigneeId, setEditedAssigneeId] = useState<string | null>(null);

  const [newCommentContent, setNewCommentContent] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Determine user permissions for the task
  const isOwnerOrCreator = user && task && (user.id === task.project.owner.id || user.id === task.creator.id);
  const isAssignee = user && task && user.id === task.assignee?.id;
  const canEditTask = isOwnerOrCreator || isAssignee;
  const canDeleteTask = isOwnerOrCreator; // Only owner or creator can delete


  useEffect(() => {
    if (projectId && taskId) {
      fetchTaskDetails(projectId, taskId);
      fetchUsers(); // Fetch users for assignee dropdown
    }
  }, [projectId, taskId]);

  const fetchTaskDetails = async (projId: string, id: string) => {
    try {
      setLoading(true);
      const taskData = await tasksService.getTaskById(projId, id);
      setTask(taskData);
      setEditedTitle(taskData.title);
      setEditedDescription(taskData.description || '');
      setEditedStatus(taskData.status);
      setEditedPriority(taskData.priority);
      setEditedDueDate(taskData.dueDate ? new Date(taskData.dueDate).toISOString().split('T')[0] : '');
      setEditedAssigneeId(taskData.assignee?.id || null);

      const commentsData = await tasksService.getCommentsByTask(id);
      setComments(commentsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch task details.');
      if (err.response?.status === 403) {
        navigate(`/projects/${projectId}`); // Redirect if no permission to task
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersData = await usersService.getUsers(); // Assuming an admin endpoint or a list of project members
      setAvailableUsers(usersData);
    } catch (err) {
      console.error("Failed to fetch users for assignee dropdown:", err);
      // Don't block task detail if users fail to load, just disable assignee selection
    }
  };

  const handleUpdateTask = async () => {
    setError(null);
    if (!task || !projectId) return;

    try {
      const updateData: UpdateTaskData = {
        title: editedTitle,
        description: editedDescription,
        status: editedStatus,
        priority: editedPriority,
        dueDate: editedDueDate ? new Date(editedDueDate) : null,
        assigneeId: editedAssigneeId,
      };
      await tasksService.updateTask(projectId, task.id, updateData);
      setIsEditingTask(false);
      await fetchTaskDetails(projectId, task.id); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!task || !newCommentContent.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    try {
      setIsAddingComment(true);
      const commentData: CreateCommentData = { content: newCommentContent };
      await tasksService.createComment(task.id, commentData);
      setNewCommentContent('');
      await fetchTaskDetails(projectId!, task.id); // Refresh comments
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment.');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    setError(null);
    if (!task) return;
    try {
      await tasksService.deleteComment(task.id, commentId);
      await fetchTaskDetails(projectId!, task.id); // Refresh comments
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment.');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    setError(null);
    if (!task || !projectId) return;
    try {
      await tasksService.deleteTask(projectId, task.id);
      navigate(`/projects/${projectId}`); // Go back to project details
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  if (loading) return <div className="text-center mt-8">Loading task details...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  if (!task) return <div className="text-center mt-8">Task not found.</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Task: {task.title}</h1>
        <div className="flex gap-2">
          {canEditTask && (
            <button
              onClick={() => setIsEditingTask(!isEditingTask)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md text-sm"
            >
              {isEditingTask ? 'Cancel Edit' : 'Edit Task'}
            </button>
          )}
          {canDeleteTask && (
            <button
              onClick={handleDeleteTask}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md text-sm"
            >
              Delete Task
            </button>
          )}
        </div>
      </div>

      {isEditingTask && canEditTask ? (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-3">Edit Task Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Title:</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="border rounded-md p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Status:</label>
              <select
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value as TaskStatus)}
                className="border rounded-md p-2 w-full"
              >
                {Object.values(TaskStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Priority:</label>
              <select
                value={editedPriority}
                onChange={(e) => setEditedPriority(e.target.value as TaskPriority)}
                className="border rounded-md p-2 w-full"
              >
                {Object.values(TaskPriority).map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Due Date:</label>
              <input
                type="date"
                value={editedDueDate}
                onChange={(e) => setEditedDueDate(e.target.value)}
                className="border rounded-md p-2 w-full"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-1">Description:</label>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="border rounded-md p-2 w-full h-24"
            ></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-1">Assignee:</label>
            <select
              value={editedAssigneeId || ''}
              onChange={(e) => setEditedAssigneeId(e.target.value || null)}
              className="border rounded-md p-2 w-full"
            >
              <option value="">Unassigned</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleUpdateTask}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mr-2"
          >
            Save Changes
          </button>
          <button
            onClick={() => setIsEditingTask(false)}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
          <p className="text-gray-700"><strong>Project:</strong> {task.project.name}</p>
          <p className="text-gray-700"><strong>Description:</strong> {task.description || 'N/A'}</p>
          <p className="text-gray-700"><strong>Status:</strong> {task.status}</p>
          <p className="text-gray-700"><strong>Priority:</strong> {task.priority}</p>
          <p className="text-gray-700"><strong>Due Date:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</p>
          <p className="text-gray-700"><strong>Creator:</strong> {task.creator.firstName} {task.creator.lastName}</p>
          <p className="text-gray-700"><strong>Assignee:</strong> {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</p>
          <p className="text-gray-500 text-sm">Created: {new Date(task.createdAt).toLocaleDateString()}</p>
          <p className="text-gray-500 text-sm">Last Updated: {new Date(task.updatedAt).toLocaleDateString()}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4 text-gray-800">Comments</h2>
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <form onSubmit={handleAddComment} className="mb-4">
          <h3 className="text-xl font-semibold mb-3">Add a Comment</h3>
          <textarea
            className="border rounded-md p-2 w-full h-24 mb-2"
            placeholder="Write your comment here..."
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            required
          ></textarea>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
            disabled={isAddingComment}
          >
            {isAddingComment ? 'Adding...' : 'Add Comment'}
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="text-gray-600">No comments yet.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="border-b pb-2">
                <p className="text-gray-800">{comment.content}</p>
                <div className="text-gray-500 text-xs mt-1 flex justify-between items-center">
                  <span>By {comment.author.firstName} {comment.author.lastName} on {new Date(comment.createdAt).toLocaleString()}</span>
                  {(user?.id === comment.author.id || user?.id === task.project.owner.id) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-500 hover:text-red-700 text-sm ml-4"
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
    </div>
  );
};

export default TaskDetail;
```