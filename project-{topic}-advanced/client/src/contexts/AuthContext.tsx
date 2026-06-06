import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { login as loginApi, register as registerApi, getMe } from '../api/auth';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth.types';
import { toast } from 'react-toastify';
import { setAuthToken, getAuthToken, removeAuthToken } from '../utils/tokenStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    const token = getAuthToken();
    if (token) {
      try {
        const userData = await getMe();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        removeAuthToken();
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const { token, user: userData } = await loginApi(credentials);
      setAuthToken(token);
      setUser(userData);
      setIsAuthenticated(true);
      toast.success('Logged in successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed.');
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      await registerApi(credentials);
      toast.success('Registration successful! Please log in.');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed.');
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    toast.info('You have been logged out.');
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