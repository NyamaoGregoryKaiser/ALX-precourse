```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import * as api from '../services/api';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const loadUserFromCookies = useCallback(async () => {
    const accessToken = Cookies.get('accessToken');
    const refreshToken = Cookies.get('refreshToken'); // For future refresh logic
    if (accessToken) {
      try {
        setLoading(true);
        const res = await api.getMe();
        if (res.data.success) {
          setUser(res.data.data);
          setIsAuthenticated(true);
        } else {
          // Token might be invalid or expired, clear and force login
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to fetch user data with existing token:', error);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromCookies();
  }, [loadUserFromCookies]);

  const handleAuthSuccess = (authData: AuthResponse) => {
    setUser(authData.user);
    setIsAuthenticated(true);
    // Set cookies with appropriate expiration (e.g., access token short, refresh token long)
    Cookies.set('accessToken', authData.accessToken, { expires: new Date(Date.now() + (30 * 60 * 1000)), secure: true, sameSite: 'Strict' }); // 30 minutes
    Cookies.set('refreshToken', authData.refreshToken, { expires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), secure: true, sameSite: 'Strict' }); // 7 days
    toast.success('Authentication successful!');
  };

  const handleAuthError = (error: any, action: string) => {
    const errorMessage = error.response?.data?.message || `Failed to ${action}. Please try again.`;
    toast.error(errorMessage);
    console.error(`Error during ${action}:`, error);
    throw error; // Re-throw so calling component can handle navigation/state
  };

  const loginFn = async (credentials: any) => {
    try {
      setLoading(true);
      const res = await api.login(credentials);
      if (res.data.success) {
        handleAuthSuccess(res.data.data);
        navigate('/dashboard');
      }
    } catch (error) {
      handleAuthError(error, 'login');
    } finally {
      setLoading(false);
    }
  };

  const registerFn = async (userData: any) => {
    try {
      setLoading(true);
      const res = await api.register(userData);
      if (res.data.success) {
        handleAuthSuccess(res.data.data);
        navigate('/dashboard');
      }
    } catch (error) {
      handleAuthError(error, 'registration');
    } finally {
      setLoading(false);
    }
  };

  const logoutFn = async () => {
    try {
      await api.logout(); // Inform backend to invalidate refresh token (if implemented)
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      toast.info('Logged out successfully.');
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out.');
    }
  };

  const value = {
    user,
    isAuthenticated,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    loading,
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

#### `frontend/src/components/AuthForm.tsx`