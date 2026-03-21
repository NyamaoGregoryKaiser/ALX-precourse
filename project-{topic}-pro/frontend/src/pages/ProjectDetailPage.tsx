```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectService, taskService } from '../services/api';
import { Project, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import TaskList from '../components/TaskList';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Form states for creating new task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) {
      navigate('/dashboard');
      return;
    }

    const fetchProjectAndTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedProject = await projectService.getProject(id);
        setProject(fetchedProject);
        const fetchedTasks = await taskService.getTasksByProject(id);
        setTasks(fetchedTasks);
      } catch (err: any) {
        console.error('Failed to fetch project or tasks:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load project details.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchProjectAndTasks();
    }
  }, [id, isAuthenticated, isLoading, navigate]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !user) return;

    setCreateTaskLoading(true);
    setCreateTaskError(null);
    try {
      const newTask = {
        title: newTaskTitle,
        description: newTaskDescription,
        projectId: project.id,
        dueDate: newTaskDueDate,
        priority: newTaskPriority as 'low' | 'medium' | 'high',
        // assignedToId: user.id // For simplicity, assign to creator or add a selector
      };
      const createdTask = await taskService.createTask(newTask);
      setTasks(prevTasks => [...prevTasks, createdTask]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskPriority('medium');
      alert('Task created successfully!');
    } catch (err: any) {
      console.error('Failed to create task:', err.response?.data || err.message);
      setCreateTaskError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      await taskService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
      alert('Task deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete task:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  if (isLoading || loading) {
    return <p style={{ textAlign: 'center' }}>Loading project details...</p>;
  }

  if (error) {
    return <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;
  }

  if (!project || !user) {
    return <p style={{ textAlign: 'center' }}>Project not found or unauthorized.</p>;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '20px auto', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Dashboard</button>

      <h1 style={{ color: '#333' }}>{project.name}</h1>
      <p style={{ color: '#555' }}>**Owner:** {project.owner?.username || 'N/A'}</p>
      <p style={{ color: '#555' }}>**Description:** {project.description}</p>
      <p style={{ color: '#555' }}>**Status:** {project.status.charAt(0).toUpperCase() + project.status.slice(1)}</p>
      <p style={{ color: '#555' }}>**Start Date:** {new Date(project.startDate).toLocaleDateString()}</p>
      <p style={{ color: '#555' }}>**End Date:** {new Date(project.endDate).toLocaleDateString()}</p>

      <hr style={{ margin: '30px 0' }} />

      {/* Task Creation Form */}
      <h3 style={{ marginBottom: '15px' }}>Create New Task</h3>
      {createTaskError && <p style={{ color: 'red' }}>{createTaskError}</p>}
      <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '20px', border: '1px solid #f0f0f0', borderRadius: '8px', marginBottom: '30px' }}>
        <div>
          <label htmlFor="taskTitle" style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
          <input type="text" id="taskTitle" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div>
          <label htmlFor="taskDescription" style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
          <textarea id="taskDescription" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} required rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}></textarea>
        </div>
        <div>
          <label htmlFor="taskDueDate" style={{ display: 'block', marginBottom: '5px' }}>Due Date:</label>
          <input type="date" id="taskDueDate" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div>
          <label htmlFor="taskPriority" style={{ display: 'block', marginBottom: '5px' }}>Priority:</label>
          <select id="taskPriority" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <button type="submit" disabled={createTaskLoading} style={{ width: '100%', padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {createTaskLoading ? 'Creating...' : 'Add Task'}
          </button>
        </div>
      </form>

      <TaskList
        tasks={tasks}
        onDeleteTask={handleDeleteTask}
        userRole={user.role}
        currentUserId={user.id}
        projectOwnerId={project.ownerId}
      />
    </div>
  );
};

export default ProjectDetailPage;
```