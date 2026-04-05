```typescript
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '../api/axios';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refetchUser: () => Promise<void>; // Optional: if you need to re-fetch user details from backend
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // For initial loading check

  const loadUserFromCookies = useCallback(() => {
    const token = Cookies.get('jwtToken');
    if (token) {
      try {
        const decoded: { userId: string; role: 'user' | 'admin'; username?: string; email?: string; exp: number } = jwtDecode(token);
        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          console.warn("JWT token expired, logging out.");
          Cookies.remove('jwtToken');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // In a real app, you might want to fetch full user details from the backend
          // using decoded.userId, but for simplicity, we'll use a basic structure.
          // Note: The `login` function now passes user data, so this will only be for initial load.
          // We can't reliably get username/email from JWT without backend passing it.
          // For now, if no username/email in JWT (which generateJwtToken doesn't include), leave it null or generic.
          setUser({ id: decoded.userId, username: decoded.username || 'User', email: decoded.email || '', role: decoded.role });
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Failed to decode JWT token:", error);
        Cookies.remove('jwtToken');
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUserFromCookies();
  }, [loadUserFromCookies]);

  const login = (token: string, userData: User) => {
    Cookies.set('jwtToken', token, { expires: 7 }); // Token expires in 7 days for cookie
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    Cookies.remove('jwtToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const refetchUser = async () => {
    // This is a placeholder. In a real app, you'd hit an /api/v1/users/me endpoint
    // to get the latest user data based on the current JWT.
    // For this project, we assume the JWT (and associated user data) is sufficient
    // upon login or initial load.
    console.log("Refetching user data (placeholder)...");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
```