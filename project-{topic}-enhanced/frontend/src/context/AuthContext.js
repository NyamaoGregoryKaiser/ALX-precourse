```javascript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth';
import { connectSocket, disconnectSocket } from '../api/socket'; // Import socket connection functions

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Function to load user and tokens from localStorage
  const loadAuthState = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedTokens = localStorage.getItem('tokens');

      if (storedUser && storedTokens) {
        const parsedUser = JSON.parse(storedUser);
        const parsedTokens = JSON.parse(storedTokens);

        // Check if access token is expired
        const accessTokenExpiry = parsedTokens.accessToken?.expires;
        if (accessTokenExpiry && new Date(accessTokenExpiry) > new Date()) {
          setUser(parsedUser);
          setIsAuthenticated(true);
          // Connect socket here with the valid access token
          connectSocket(parsedTokens.accessToken.token);
        } else {
          // If access token expired, try to refresh
          console.log('Access token expired, attempting to refresh...');
          refreshAuthToken(parsedTokens.refreshToken?.token, parsedUser);
        }
      }
    } catch (error) {
      console.error('Failed to parse stored auth state:', error);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to refresh token
  const refreshAuthToken = useCallback(async (refreshToken, currentUser) => {
    if (!refreshToken) {
      console.log('No refresh token available. Clearing auth state.');
      clearAuthState();
      return;
    }
    try {
      const response = await authApi.refreshToken(refreshToken);
      const newTokens = response.data.tokens;
      const newUser = response.data.user;

      localStorage.setItem('tokens', JSON.stringify(newTokens));
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      setIsAuthenticated(true);
      connectSocket(newTokens.accessToken.token); // Reconnect socket with new token
      console.log('Tokens refreshed successfully.');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearAuthState();
    }
  }, []);

  // Function to clear user and tokens from localStorage and state
  const clearAuthState = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    setUser(null);
    setIsAuthenticated(false);
    disconnectSocket(); // Disconnect socket on logout
  }, []);


  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);


  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password });
      const { user: loggedInUser, tokens } = response.data;
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      localStorage.setItem('tokens', JSON.stringify(tokens));
      setUser(loggedInUser);
      setIsAuthenticated(true);
      connectSocket(tokens.accessToken.token); // Connect socket on successful login
      return loggedInUser;
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      clearAuthState();
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await authApi.register({ username, email, password });
      // For registration, we typically just get a success message or user data.
      // The user would then log in separately.
      console.log('Registration successful:', response.data.user.username);
      // Optionally, you could automatically log in the user here
      // But for clarity, we'll let them login manually after registration.
      return response.data.user;
    } catch (error) {
      console.error('Register error:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      // Send logout request to backend to invalidate refresh token
      await authApi.logout();
    } catch (error) {
      console.error('Backend logout error (might already be logged out or token invalid):', error.message);
    } finally {
      clearAuthState();
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```