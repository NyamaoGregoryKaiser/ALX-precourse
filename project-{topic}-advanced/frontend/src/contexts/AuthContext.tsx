```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '../api/axios';
import { message } from 'antd';

export const TOKEN_KEY = 'jwt_token';
export const USER_KEY = 'user_data';

interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  register: (token: string, userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const userDataString = localStorage.getItem(USER_KEY);

      if (token && userDataString) {
        try {
          const storedUser: User = JSON.parse(userDataString);
          // Optional: Verify token with backend or decode it client-side
          // For simplicity, we trust the stored token and user data for now.
          // A real app might hit /api/auth/me to validate the token.
          const response = await axios.get('/auth/me');
          if (response.data.status === 'success') {
            setIsAuthenticated(true);
            setUser(response.data.data.user);
          } else {
            throw new Error("Token validation failed");
          }
        } catch (error) {
          message.error('Session expired or invalid. Please log in again.');
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUserFromStorage();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const register = (token: string, userData: User) => {
    login(token, userData); // Registration usually logs in the user directly
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setUser(null);
    message.success('Logged out successfully!');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, register }}>
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