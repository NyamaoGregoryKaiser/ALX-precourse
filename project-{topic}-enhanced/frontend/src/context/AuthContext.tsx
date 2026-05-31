```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, LoginPayload, RegisterPayload, UserRole } from '../types';
import * as AuthService from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (userData: RegisterPayload) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = AuthService.getToken();
    const storedUser = AuthService.getCurrentUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginPayload) => {
    setLoading(true);
    try {
      const authData = await AuthService.loginUser(credentials);
      AuthService.saveAuthData(authData.access_token, authData.user);
      setToken(authData.access_token);
      setUser(authData.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterPayload) => {
    setLoading(true);
    try {
      const authData = await AuthService.registerUser(userData);
      AuthService.saveAuthData(authData.access_token, authData.user);
      setToken(authData.access_token);
      setUser(authData.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logoutUser();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated, hasRole, loading }}>
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