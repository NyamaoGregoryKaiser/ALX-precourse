```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const loadUser = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      try {
        const response = await axiosInstance.get('/auth/me');
        setUser(response.data.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to fetch user data, token might be invalid/expired:', error);
        localStorage.clear(); // Clear invalid tokens
        setIsAuthenticated(false);
        setUser(null);
        showNotification('Session expired. Please log in again.', 'error');
        // navigate('/login'); // Let the interceptor handle navigation
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setLoading(false);
  }, [showNotification]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      setIsAuthenticated(true);
      showNotification('Login successful!', 'success');
      navigate('/');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed.';
      showNotification(errorMessage, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/register', { username, email, password });
      showNotification('Registration successful! Please log in.', 'success');
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed.';
      showNotification(errorMessage, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setLoading(true);
    localStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    showNotification('You have been logged out.', 'info');
    navigate('/login');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```