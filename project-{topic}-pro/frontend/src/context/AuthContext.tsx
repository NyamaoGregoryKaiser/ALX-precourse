```typescript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { User, LoginData, RegisterData } from '../types';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  exp: number; // Expiration time
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkTokenValidity = useCallback(() => {
    const token = authService.getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode<JwtPayload>(token);
        // Check if token is expired
        if (decodedToken.exp * 1000 > Date.now()) {
          const storedUser = authService.getCurrentUser();
          if (storedUser && storedUser.id === decodedToken.sub) {
            setUser(storedUser);
            setIsAuthenticated(true);
          } else {
            // User in localStorage might be inconsistent with token, clear it
            authService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // Token expired
          console.log('Token expired.');
          authService.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);


  useEffect(() => {
    checkTokenValidity();
    // Optional: set up an interval to periodically check token validity or refresh it
    // const interval = setInterval(checkTokenValidity, 60 * 1000 * 5); // Every 5 minutes
    // return () => clearInterval(interval);
  }, [checkTokenValidity]);

  const loginHandler = async (credentials: LoginData) => {
    const authResponse = await authService.login(credentials);
    setUser(authResponse.user);
    setIsAuthenticated(true);
  };

  const registerHandler = async (userData: RegisterData) => {
    await authService.register(userData);
    // After registration, user needs to login separately
  };

  const logoutHandler = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login: loginHandler, register: registerHandler, logout: logoutHandler }}>
      {children}
    </AuthContext.Provider>
  );
};
```