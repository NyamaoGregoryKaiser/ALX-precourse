import axios from 'axios';

const API_URL = '/v1/auth';

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data;
};

export const logout = async (refreshToken) => {
  const response = await axios.post(`${API_URL}/logout`, { refreshToken });
  return response.data;
};

export const refreshTokens = async (refreshToken) => {
  const response = await axios.post(`${API_URL}/refresh-tokens`, { refreshToken });
  return response.data;
};