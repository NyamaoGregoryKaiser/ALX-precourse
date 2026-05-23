import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as api from '../api/auth';
import { LoginPayload, RegisterPayload, User } from '../api/types';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (token) {
      // Potentially validate token with backend or decode locally for basic checks
      // For this example, just assume if token exists, user is authenticated
      // A more robust solution would be to call a /me endpoint or similar
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
        setIsAuthenticated(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error("Failed to parse user data from local storage", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (payload: LoginPayload) => {
    const { token, user: userData } = await api.login(payload);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsAuthenticated(true);
    setUser(userData);
  };

  const register = async (payload: RegisterPayload) => {
    await api.register(payload);
    // After registration, user typically logs in or is redirected to login
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, register, logout }}>
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