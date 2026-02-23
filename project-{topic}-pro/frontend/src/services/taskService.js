```javascript
import api from './api';

const taskService = {
  /**
   * Creates a new task within a project.
   * @param {string} projectId - The ID of the project the task belongs to.
   * @param {object} taskData - Data for the new task.
   * @returns {Promise<object>} The created task.
   */
  createTask: async (projectId, taskData) => {
    const response = await api.post(`/projects/${projectId}/tasks`, taskData);
    return response.data.data;
  },

  /**
   * Fetches all tasks for a specific project.
   * @param {string} projectId - The ID of the project.
   * @returns {Promise<Array<object>>} List of tasks.
   */
  getTasksByProjectId: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response.data.data;
  },

  /**
   * Fetches a single task by ID.
   * @param {string} taskId - The ID of the task.
   * @returns {Promise<object>} The task details.
   */
  getTaskById: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data.data;
  },

  /**
   * Updates an existing task.
   * @param {string} taskId - The ID of the task to update.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated task.
   */
  updateTask: async (taskId, updateData) => {
    const response = await api.put(`/tasks/${taskId}`, updateData);
    return response.data.data;
  },

  /**
   * Deletes a task.
   * @param {string} taskId - The ID of the task to delete.
   * @returns {Promise<object>} Confirmation message.
   */
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },
};

export default taskService;
```