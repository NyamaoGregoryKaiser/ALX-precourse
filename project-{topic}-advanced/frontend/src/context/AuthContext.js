import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Function to set authentication state and token
  const setAuthData = useCallback((userData, token) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
    setUser(userData);
    setIsAuthenticated(!!userData);
  }, []);

  // Check for token on app load
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // Verify token and fetch user data
          const res = await api.get('/auth/profile');
          setAuthData(res.data.user, token);
        } catch (error) {
          console.error('Failed to load user from token:', error);
          setAuthData(null, null); // Clear invalid token
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [setAuthData]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuthData(res.data.user, res.data.token);
      return { success: true, message: 'Logged in successfully!' };
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await api.post('/auth/register', { username, email, password });
      setAuthData(res.data.user, res.data.token);
      return { success: true, message: 'Registration successful!' };
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setAuthData(null, null);
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;