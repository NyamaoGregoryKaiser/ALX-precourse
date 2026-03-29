```typescript
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import api from '../api/api';

interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
  loading: boolean;
  login: (token: string, userRole: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides authentication state and functions (login, logout) to the application.
 * Stores token and role in localStorage.
 * @param children React nodes to be rendered within the provider.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // To handle initial auth check

  useEffect(() => {
    // Check for existing token and role in localStorage on mount
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');

    if (token && storedRole) {
      // You might want to add token validation here (e.g., check expiration)
      setIsAuthenticated(true);
      setRole(storedRole);
    }
    setLoading(false);
  }, []);

  const login = (token: string, userRole: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', userRole);
    setIsAuthenticated(true);
    setRole(userRole);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to easily consume the AuthContext.
 * Throws an error if used outside of an AuthProvider.
 * @returns AuthContextType
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```