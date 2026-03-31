```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getMe, loginUser, registerUser } from '../api/auth';
import { AuthUser, DecodedToken, TokenResponse } from '../types';
import { LOCAL_STORAGE_TOKEN_KEY } from '../utils/constants';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
  const [loading, setLoading] = useState<boolean>(true);

  const saveAuthData = useCallback((tokenResponse: TokenResponse, userProfile: AuthUser) => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, tokenResponse.access_token);
    setToken(tokenResponse.access_token);
    setUser(userProfile);
    setIsAuthenticated(true);
    toast.success(`Welcome, ${userProfile.username}!`);
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    toast.info("You have been logged out.");
  }, []);

  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const decoded: DecodedToken = jwtDecode(accessToken);
      const userId = parseInt(decoded.sub);
      if (isNaN(userId)) throw new Error("Invalid user ID in token");

      const userProfile = await getMe(); // Fetches full user profile from /users/me
      if (userProfile.id !== userId) throw new Error("Token user ID mismatch with profile");

      setUser({
        id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to fetch user profile or validate token:", error);
      clearAuthData(); // Clear token if validation fails
    } finally {
      setLoading(false);
    }
  }, [clearAuthData]);

  useEffect(() => {
    if (token) {
      const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
      if (decoded && decoded.exp * 1000 > Date.now()) {
        fetchUserProfile(token);
      } else {
        clearAuthData();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [token, fetchUserProfile, clearAuthData]);

  const loginHandler = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const tokenResponse = await loginUser({ email, password });
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, tokenResponse.access_token);
      setToken(tokenResponse.access_token);
      // Fetch user profile immediately after setting token
      await fetchUserProfile(tokenResponse.access_token);
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error(error.response?.data?.detail || "Login failed.");
      clearAuthData();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearAuthData, fetchUserProfile]);

  const registerHandler = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const tokenResponse = await registerUser({ username, email, password });
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, tokenResponse.access_token);
      setToken(tokenResponse.access_token);
      await fetchUserProfile(tokenResponse.access_token);
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast.error(error.response?.data?.detail || "Registration failed.");
      clearAuthData();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearAuthData, fetchUserProfile]);

  const logoutHandler = useCallback(() => {
    clearAuthData();
  }, [clearAuthData]);

  const value = {
    user,
    token,
    isAuthenticated,
    login: loginHandler,
    register: registerHandler,
    logout: logoutHandler,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```