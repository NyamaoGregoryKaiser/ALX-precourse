import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import { setAuthToken, removeAuthToken, getAuthToken } from '../utils/authToken';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to check authentication status (e.g., on app load or token refresh)
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = getAuthToken();
    if (token) {
      try {
        const { user: userData } = await authApi.checkAuth();
        setIsAuthenticated(true);
        setUser(userData);
      } catch (err) {
        console.error('Authentication check failed:', err);
        removeAuthToken();
        setIsAuthenticated(false);
        setUser(null);
        // Optionally set an error here, but silently failing for expired token is common
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []); // Only re-create if dependencies change (none here)

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const { token, user: userData } = await authApi.login(email, password);
      setAuthToken(token);
      setIsAuthenticated(true);
      setUser(userData);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: error.response?.data?.message || err.message };
    }
  };

  const register = async (username, email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const { token, user: userData } = await authApi.register(username, email, password);
      setAuthToken(token);
      setIsAuthenticated(true);
      setUser(userData);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  const value = {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    setError // Allow components to clear/set auth-related errors
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