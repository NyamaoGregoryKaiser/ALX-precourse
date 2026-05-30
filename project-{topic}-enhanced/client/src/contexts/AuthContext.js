import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';
import { setAuthTokens, getAuthTokens, removeAuthTokens } from '../utils/authStorage';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set up Axios interceptors for token refresh
  useEffect(() => {
    const tokens = getAuthTokens();
    if (tokens && tokens.access) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access.token}`;
      // In a real app, you would also verify the access token's validity here
      // and potentially fetch user data if needed.
      setUser(JSON.parse(localStorage.getItem('user'))); // Re-hydrate user from local storage
      setIsAuthenticated(true);
    }
    setLoading(false);

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        // Check for 401 Unauthorized and if it's not a refresh token request itself
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true; // Mark request to avoid infinite loops
          const currentTokens = getAuthTokens();
          if (currentTokens && currentTokens.refresh) {
            try {
              const { tokens: newTokens, user: refreshedUser } = await authApi.refreshTokens(currentTokens.refresh.token);
              setAuthTokens(newTokens);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newTokens.access.token}`;
              originalRequest.headers['Authorization'] = `Bearer ${newTokens.access.token}`;
              return axios(originalRequest); // Retry the original request with new token
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError);
              logout(); // If refresh fails, log out user
              return Promise.reject(refreshError);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { user: loggedInUser, tokens } = await authApi.login(email, password);
      setAuthTokens(tokens);
      setUser(loggedInUser);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access.token}`;
      localStorage.setItem('user', JSON.stringify(loggedInUser)); // Store user data
      return loggedInUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { user: registeredUser, tokens } = await authApi.register(userData);
      setAuthTokens(tokens);
      setUser(registeredUser);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access.token}`;
      localStorage.setItem('user', JSON.stringify(registeredUser));
      return registeredUser;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    const tokens = getAuthTokens();
    if (tokens && tokens.refresh) {
      try {
        await authApi.logout(tokens.refresh.token);
      } catch (error) {
        console.error('Logout API call failed, but clearing local state:', error);
      }
    }
    removeAuthTokens();
    setUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('user');
  };

  const authContextValue = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};