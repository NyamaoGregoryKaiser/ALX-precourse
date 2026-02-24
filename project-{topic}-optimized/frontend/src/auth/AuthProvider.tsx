```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { login as loginApi, register as registerApi } from '../api/auth';
import { AuthRequest, AuthResponse, RegisterRequest } from '../types';
import { setToken, getToken, removeToken, decodeToken } from '../utils/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (credentials: AuthRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Initial loading state

  const initializeAuth = useCallback(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = decodeToken(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          setUsername(decoded.sub); // 'sub' claim usually holds the username
        } else {
          removeToken();
          setIsAuthenticated(false);
          setUsername(null);
        }
      } catch (error) {
        console.error('Failed to decode or validate token:', error);
        removeToken();
        setIsAuthenticated(false);
        setUsername(null);
      }
    } else {
      setIsAuthenticated(false);
      setUsername(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (credentials: AuthRequest) => {
    setLoading(true);
    try {
      const response: AuthResponse = await loginApi(credentials);
      setToken(response.accessToken);
      setUsername(response.username);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    setLoading(true);
    try {
      const response: AuthResponse = await registerApi(userData);
      setToken(response.accessToken);
      setUsername(response.username);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
    setUsername(null);
  };

  const value = {
    isAuthenticated,
    username,
    login,
    register,
    logout,
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