```typescript
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAccessToken, getRefreshToken, getUser, setAuthTokens, setUser, clearAuthTokens } from '@utils/localStorage';
import { refreshAuthTokens as callRefreshTokensApi } from '@api/auth';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // 'admin', 'user', 'guest' etc.
  isEmailVerified?: boolean; // Optional, might be available in profile endpoint
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpires: Date;
  refreshExpires: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: User, tokens: AuthTokens) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // For initial authentication check

  const login = useCallback((userData: User, tokens: AuthTokens) => {
    setUserState(userData);
    setIsAuthenticated(true);
    setUser(userData);
    setAuthTokens(tokens);
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    setIsAuthenticated(false);
    clearAuthTokens();
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const newTokens = await callRefreshTokensApi(refreshToken);
      setAuthTokens(newTokens);
      // Update user state if necessary (e.g., if user info is embedded in token or refreshed from backend)
      // For simplicity, we assume user data doesn't change on token refresh.
      // If user data is updated with token, you'd need to re-decode or call a /me endpoint.
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return false;
    }
  }, [logout]);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUserState((prevUser) => {
      if (!prevUser) return null;
      const updated = { ...prevUser, ...userData };
      setUser(updated); // Update in local storage
      return updated;
    });
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const storedUser = getUser();
      const storedAccessToken = getAccessToken();
      const storedRefreshToken = getRefreshToken();

      if (storedUser && storedAccessToken && storedRefreshToken) {
        try {
          // Decode access token to check expiry locally (for better UX)
          const decodedAccessToken: { exp: number } = jwtDecode(storedAccessToken);
          const currentTime = Date.now() / 1000; // in seconds

          if (decodedAccessToken.exp > currentTime) {
            // Access token is still valid
            setUserState(storedUser);
            setIsAuthenticated(true);
          } else {
            // Access token expired, try to refresh
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              const newAccessToken = getAccessToken(); // Get the newly refreshed token
              if (newAccessToken) {
                 // Decode the new access token to get user info if needed
                 // For now, assume storedUser is still valid as it's from localStorage
                setUserState(storedUser);
                setIsAuthenticated(true);
              } else {
                logout(); // Refresh token failed
              }
            } else {
              logout(); // Refresh token failed
            }
          }
        } catch (error) {
          console.error('Error checking auth status or decoding token:', error);
          logout(); // In case of token malformation or other issues
        }
      } else {
        logout(); // No tokens found, ensure logged out state
      }
      setLoading(false);
    };

    checkAuthStatus();

    // Set up a periodic check/refresh for access token before it expires (e.g., every 5 minutes if expiry is 30m)
    const interval = setInterval(async () => {
      const accessToken = getAccessToken();
      if (accessToken) {
        try {
          const decodedAccessToken: { exp: number } = jwtDecode(accessToken);
          const currentTime = Date.now() / 1000;
          const expiresIn = decodedAccessToken.exp - currentTime; // seconds

          // If access token is about to expire (e.g., within 5 minutes)
          if (expiresIn < 5 * 60) {
            console.log('Access token near expiry, attempting to refresh...');
            await refreshAccessToken();
          }
        } catch (error) {
          console.error('Error checking access token for refresh interval:', error);
          logout();
        }
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval); // Clean up interval on unmount
  }, [logout, refreshAccessToken]);

  const contextValue = { user, isAuthenticated, loading, login, logout, refreshAccessToken, updateUser };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```