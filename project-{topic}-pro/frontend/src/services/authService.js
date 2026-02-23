```javascript
import api from './api';

const authService = {
  /**
   * Registers a new user.
   * @param {object} userData - User registration data (username, email, password, role).
   * @returns {Promise<object>} Response data containing token and user info.
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Logs in a user.
   * @param {object} credentials - User login credentials (email, password).
   * @returns {Promise<object>} Response data containing token and user info.
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Fetches the current authenticated user's profile.
   * @returns {Promise<object>} User profile data.
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
};

export default authService;
```