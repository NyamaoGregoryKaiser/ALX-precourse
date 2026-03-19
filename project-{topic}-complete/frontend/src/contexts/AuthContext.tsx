```typescript
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import axiosInstance from '../api/axiosInstance';
import { User, AuthResponse, UserRole } from '../types';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children | ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to save auth data to local storage
  const saveAuthData = useCallback((userData: User, jwtToken: string) => {
    localStorage.setItem('jwtToken', jwtToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
    setToken(jwtToken);
    setIsAuthenticated(true);
  }, []);

  // Function to clear auth data from local storage and state
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userData');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  // Check authentication status on app load
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('jwtToken');
    const storedUserData = localStorage.getItem('userData');

    if (storedToken && storedUserData) {
      try {
        const parsedUser: User = JSON.parse(storedUserData);
        // Optional: Verify token with backend, e.g., /api/v1/auth/me
        // For simplicity, we trust the stored token for now. Axios interceptor will handle 401s.
        setUser(parsedUser);
        setToken(storedToken);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        clearAuthData(); // Clear invalid data
      }
    } else {
      clearAuthData();
    }
    setIsLoading(false);
  }, [clearAuthData]);


  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post<AuthResponse>('/auth/login', { email, password });
      saveAuthData(response.data.user, response.data.token);
      toast.success('Logged in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post<AuthResponse>('/auth/register', { firstName, lastName, email, password, role: UserRole.CUSTOMER });
      saveAuthData(response.data.user, response.data.token);
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
    toast.info('You have been logged out.');
  };

  const value = {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    isLoading,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```