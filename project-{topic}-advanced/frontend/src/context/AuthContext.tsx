```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { User } from '../types';
import { jwtDecode } from 'jwt-decode'; // Use named import for consistency
import { toast } from 'react-hot-toast'; // For user feedback
import logger from '../utils/logger'; // Frontend logger

// Define the shape of the JWT payload we expect
interface JwtPayload {
  userId: string;
  role: string;
  email: string; // Assuming email is also in the token for quick access
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Initial loading state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const login = (token: string, userData: User) => {
    localStorage.setItem('jwtToken', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(userData.role === 'admin');
    logger.info('User logged in successfully.');
    toast.success(`Welcome, ${userData.username}!`);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('jwtToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    logger.info('User logged out.');
    toast.success('You have been logged out.');
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('jwtToken');
    if (token) {
      try {
        const decodedToken = jwtDecode<JwtPayload>(token);

        // Check if token is expired
        if (decodedToken.exp * 1000 < Date.now()) {
          logger.warn('JWT token expired. Logging out user.');
          logout();
          return;
        }

        // Token is valid, set up Axios header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Fetch fresh user data from /auth/me to ensure it's current and token is valid server-side
        // This also populates the 'user' state with full details, not just token payload
        const response = await api.get('/auth/me');
        const userData: User = response.data;

        setUser(userData);
        setIsAuthenticated(true);
        setIsAdmin(userData.role === 'admin');
        logger.info(`User ${userData.email} authenticated and profile fetched.`);
      } catch (error: any) {
        logger.error('Error during token validation or fetching user profile:', error);
        toast.error('Session expired or invalid. Please log in again.');
        logout();
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkAuth, isAdmin }}>
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