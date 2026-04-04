```typescript
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import * as authService from '../services/auth';
import { getAuthToken, saveAuthToken, removeAuthToken } from '../utils/localStorage';
import * as userService from '../services/user';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUserFromToken = async () => {
      const storedToken = getAuthToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          // Verify token and fetch user data from backend
          const fetchedUser = await userService.getMe(storedToken);
          setUser(fetchedUser);
        } catch (error) {
          console.error('Failed to fetch user from token:', error);
          removeAuthToken(); // Token might be invalid or expired
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUserFromToken();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { token, user: userData } = await authService.login(email, password);
      saveAuthToken(token);
      setToken(token);
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      await authService.register(username, email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (updatedUser: Partial<User>) => {
    setUser(prevUser => (prevUser ? { ...prevUser, ...updatedUser } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUserProfile }}>
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