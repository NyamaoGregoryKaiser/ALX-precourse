import axios from 'axios';
import { LoginPayload, RegisterPayload, AuthResponse, User } from '@/types/auth';
import { Product } from '@/types/product';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error codes, e.g., 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized request. Logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Optionally redirect to login page
      // window.location.href = '/login';
    }
    return Promise.reject(error.response?.data?.message || error.message);
  }
);

// --- Auth API Calls ---
export const registerUser = async (data: RegisterPayload): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data: LoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
};

export const getMyProfile = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// --- Product API Calls ---
export const getProducts = async (params?: { categoryId?: string; search?: string; page?: number; limit?: number }): Promise<{ products: Product[]; total: number; page: number; limit: number }> => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

// --- Other API Calls (conceptual) ---
// export const getCategories = async (): Promise<Category[]> => {
//   const response = await apiClient.get('/categories');
//   return response.data;
// };

// export const createOrder = async (orderData: OrderPayload): Promise<Order> => {
//   const response = await apiClient.post('/orders', orderData);
//   return response.data;
// };