```tsx
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthResponse } from 'types';
import axiosInstance from 'api/axiosInstance';
import { disconnectSocket } from 'api/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (authResponse: AuthResponse) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  loading: true, // Default to true until initial check
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        // Optionally, make a request to /api/users/me to validate token and fetch fresh user data
        const response = await axiosInstance.get('/users/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUser(response.data.data.user);
        setToken(storedToken);
      } catch (error) {
        console.error('Token validation failed, logging out:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
        disconnectSocket();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = (authResponse: AuthResponse) => {
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    setToken(authResponse.token);
    setUser(authResponse.user);
  };

  const logout = async () => {
    try {
      // Invalidate token on the backend
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Error logging out on backend:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      disconnectSocket(); // Disconnect socket on logout
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```