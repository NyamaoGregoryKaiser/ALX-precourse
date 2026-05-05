import axiosInstance from './axiosInstance';

export const loginUser = async (username, password) => {
  try {
    const response = await axiosInstance.post('/api/auth/login', { username, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Login failed';
  }
};

export const registerUser = async (username, password) => {
  try {
    const response = await axiosInstance.post('/api/auth/register', { username, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed';
  }
};