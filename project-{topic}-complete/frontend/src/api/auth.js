import api from './index';

export const register = async (username, email, password) => {
  try {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
};

export const checkAuth = async () => {
  try {
    const response = await api.get('/auth/me');
    return { isAuthenticated: true, user: response.data.user };
  } catch (error) {
    // For 401 (Unauthorized), the interceptor should handle logout.
    // For other errors, we just treat as unauthenticated.
    console.error('Auth check failed:', error.response?.data || error.message);
    return { isAuthenticated: false, user: null };
  }
};