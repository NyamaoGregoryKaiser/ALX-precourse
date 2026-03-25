import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User, AuthResponse } from '../types/chat';
import { setAuthToken, setChatAuthToken, login as apiLogin, register as apiRegister, logout as apiLogout, refreshToken as apiRefreshToken, getMyProfile } from '../api/auth';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user'; // Store minimal user info

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getStoredTokens = useCallback(() => {
    const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    return {
      accessToken: storedAccess,
      refreshToken: storedRefresh,
      user: storedUser ? JSON.parse(storedUser) : null,
    };
  }, []);

  const storeAuthData = useCallback((data: AuthResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setAccessToken(data.accessToken);
    setUser(data.user);
    setAuthToken(data.accessToken);
    setChatAuthToken(data.accessToken);
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setUser(null);
    setAuthToken(null);
    setChatAuthToken(null);
  }, []);

  // Effect to initialize auth state from localStorage and potentially refresh token
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      setError(null);
      const { accessToken: storedAccess, refreshToken: storedRefresh, user: storedUser } = getStoredTokens();

      if (storedAccess && storedRefresh && storedUser) {
        setAuthToken(storedAccess);
        setChatAuthToken(storedAccess);
        setUser(storedUser);
        setAccessToken(storedAccess); // Optimistically set

        try {
          // Attempt to get user profile to validate access token
          await getMyProfile();
          setLoading(false);
        } catch (err: any) {
          // Access token might be expired, try refreshing
          try {
            const { accessToken: newAccessToken } = await apiRefreshToken(storedRefresh);
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
            setAccessToken(newAccessToken);
            setAuthToken(newAccessToken);
            setChatAuthToken(newAccessToken);
            await getMyProfile(); // Validate new access token
            setLoading(false);
          } catch (refreshErr: any) {
            console.error('Failed to refresh token:', refreshErr);
            clearAuthData();
            setError('Session expired. Please log in again.');
            setLoading(false);
            navigate('/login');
          }
        }
      } else {
        clearAuthData();
        setLoading(false);
      }
    };
    initializeAuth();
  }, [getStoredTokens, clearAuthData, navigate]);

  const handleAuthError = useCallback((err: any) => {
    const message = err.response?.data?.message || err.message || 'An unexpected error occurred.';
    setError(message);
    console.error('Authentication Error:', err);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const data = await apiLogin(email, password);
      storeAuthData(data);
      navigate('/chat');
    } catch (err) {
      handleAuthError(err);
      throw err; // Re-throw to allow component to catch
    }
  }, [storeAuthData, navigate, handleAuthError]);

  const handleRegister = useCallback(async (username: string, email: string, password: string) => {
    setError(null);
    try {
      const data = await apiRegister(username, email, password);
      storeAuthData(data);
      navigate('/chat');
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  }, [storeAuthData, navigate, handleAuthError]);

  const handleLogout = useCallback(async () => {
    try {
      if (accessToken) {
        await apiLogout(); // Call backend logout to invalidate refresh token
      }
    } catch (err) {
      console.error('Logout API call failed:', err);
      // Even if API fails, clear client-side data
    } finally {
      clearAuthData();
      navigate('/login');
    }
  }, [accessToken, clearAuthData, navigate]);

  const isAuthenticated = !!user && !!accessToken;

  const contextValue = {
    user,
    isAuthenticated,
    accessToken,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    loading,
    error,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};