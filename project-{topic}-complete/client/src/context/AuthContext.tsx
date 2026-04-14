import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../api/api';
import { setToken, getToken, removeToken, setUserData, getUserData, removeUserData } from '../utils/localStorage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const storedUser = getUserData();
    if (token && storedUser) {
      try {
        // Verify token with backend
        const res = await api.get('/auth/me');
        if (res.data.user && res.data.user.id === storedUser.id) {
          setUser(storedUser); // Use stored user data if valid
        } else {
          // Token valid but user data mismatch (e.g., role changed)
          console.warn('User data mismatch, re-fetching user data.');
          setUser(res.data.user);
          setUserData(res.data.user);
        }
      } catch (err) {
        console.error('Token validation failed:', err);
        removeToken();
        removeUserData();
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    setToken(token);
    setUserData(userData);
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    removeUserData();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};