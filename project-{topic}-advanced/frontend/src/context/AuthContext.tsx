```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, getMe } from '../api/auth';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const setAuthData = (userData: User, accessToken: string) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('accessToken', accessToken);
  };

  const clearAuthData = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('accessToken');
  };

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const response = await getMe();
        setAuthData(response.user, accessToken);
      } else {
        clearAuthData();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const response = await loginUser(credentials);
      setAuthData(response.user, response.accessToken);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      throw error; // Re-throw to be handled by the component
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: any) => {
    setLoading(true);
    try {
      const response = await registerUser(credentials);
      setAuthData(response.user, response.accessToken);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      clearAuthData();
      navigate('/login');
    } catch (error: any) {
      console.error('Logout failed:', error.response?.data?.message || error.message);
      // Even if logout API fails, we should clear client-side auth data
      clearAuthData();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    fetchUser,
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