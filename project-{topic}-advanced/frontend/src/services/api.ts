```typescript
import axios from 'axios';
import Cookies from 'js-cookie';
import { AuthResponse, User, Database, SlowQuery, ApiResponse, PagingOptions, QuerySuggestion, SuggestionStatus } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration (conceptual for refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Example: If 401 and not a login/register request, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/register') {
      originalRequest._retry = true; // Mark as retried to prevent infinite loops

      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        try {
          // In a full system, you'd have a /auth/refresh endpoint
          // const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          // const newAccessToken = refreshResponse.data.data.accessToken;
          // Cookies.set('accessToken', newAccessToken, { expires: 1/24/60 * 30 }); // 30 mins
          // originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          // return api(originalRequest);
          // For now, if refresh token exists but no refresh endpoint, just assume it failed.
          console.warn('Attempted to refresh token, but no refresh endpoint available or failed.');
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          window.location.href = '/login'; // Redirect to login
          return Promise.reject(refreshError);
        }
      }
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      window.location.href = '/login'; // Redirect to login
    }
    return Promise.reject(error);
  }
);

// --- Auth Endpoints ---
export const login = (credentials: any) => api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
export const register = (userData: any) => api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
export const logout = () => api.post<ApiResponse<any>>('/auth/logout');
export const getMe = () => api.get<ApiResponse<User>>('/auth/me');

// --- User Endpoints (Admin specific for most) ---
export const getUsers = () => api.get<ApiResponse<User[]>>('/users');
export const getUser = (id: string) => api.get<ApiResponse<User>>(`/users/${id}`);
export const updateUser = (id: string, data: Partial<User>) => api.put<ApiResponse<User>>(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete<ApiResponse<any>>(`/users/${id}`);

// --- Database Endpoints ---
export const createDatabase = (data: Partial<Database>) => api.post<ApiResponse<Database>>('/databases', data);
export const getDatabases = () => api.get<ApiResponse<Database[]>>('/databases');
export const getDatabase = (id: string) => api.get<ApiResponse<Database>>(`/databases/${id}`);
export const updateDatabase = (id: string, data: Partial<Database>) => api.put<ApiResponse<Database>>(`/databases/${id}`, data);
export const deleteDatabase = (id: string) => api.delete<ApiResponse<any>>(`/databases/${id}`);

// --- Query Endpoints ---
export const reportSlowQuery = (data: Partial<SlowQuery>) => api.post<ApiResponse<SlowQuery>>('/queries/slow', data);
export const getSlowQueries = (options?: PagingOptions) => {
  return api.get<ApiResponse<SlowQuery[]>>('/queries/slow', { params: options });
};
export const getSlowQuery = (id: string) => api.get<ApiResponse<SlowQuery>>(`/queries/slow/${id}`);
export const updateQuerySuggestionStatus = (queryId: string, suggestionId: string, status: SuggestionStatus, feedback?: string) =>
  api.patch<ApiResponse<QuerySuggestion>>(`/queries/slow/${queryId}/suggestions/${suggestionId}`, { status, feedback });

export default api;
```

#### `frontend/src/context/AuthContext.tsx`