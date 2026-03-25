import axios from 'axios';
import { AuthResponse, User } from '../types/chat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete authApi.defaults.headers.common['Authorization'];
  }
};

export const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await authApi.post('/register', { username, email, password });
  return response.data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await authApi.post('/login', { email, password });
  return response.data;
};

export const refreshToken = async (currentRefreshToken: string): Promise<{ accessToken: string }> => {
  // We need to send the refresh token in the body, but the endpoint is protected by the (potentially expired) access token
  // A better approach might be to have a separate, unprotected endpoint for refresh or use http-only cookies.
  // For this example, we'll send it in the body with a valid (but potentially short-lived) access token header.
  const response = await authApi.post('/refresh-token', { refreshToken: currentRefreshToken });
  return response.data;
};

export const logout = async (): Promise<void> => {
  await authApi.post('/logout');
};

export const getMyProfile = async (): Promise<User> => {
  const response = await axios.get(`${API_BASE_URL}/users/me`);
  return response.data;
};

export default authApi;