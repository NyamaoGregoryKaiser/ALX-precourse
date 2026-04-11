```tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  address?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwtToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Verify token validity by fetching user data
          const response = await apiClient.get('/auth/me');
          setUser(response.data.data.user);
        } catch (error) {
          console.error('Failed to load user from token:', error);
          localStorage.removeItem('jwtToken');
          setToken(null);
          setUser(null);
          toast.error('Session expired or invalid. Please log in again.');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('jwtToken', newToken);
    setToken(newToken);
    setUser(userData);
    toast.success('Logged in successfully!');
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    setToken(null);
    setUser(null);
    toast.info('Logged out.');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prevUser) => (prevUser ? { ...prevUser, ...userData } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout, updateUser }}>
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