import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // Note: jwt-decode is a client-side library

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Function to check if the token is valid (from client-side cookie)
  // This is a common pattern, but remember JS cannot directly read httpOnly cookies.
  // The backend should always re-verify the token. This client-side check is
  // for UX (e.g., showing login/logout buttons, redirecting if token is *definitely* gone).
  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch user profile, which requires a valid cookie-based token
      const response = await api.get('/auth/profile');
      if (response.data) {
        setIsAuthenticated(true);
        setUser(response.data);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error.response?.data?.message || error.message);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      setIsAuthenticated(true);
      setUser(response.data.user);
      navigate('/dashboards'); // Redirect to a protected route
      return response.data;
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      // After registration, typically log in the user or redirect to login page
      navigate('/login');
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setIsAuthenticated(false);
      setUser(null);
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API logout fails, clear client-side state for UX
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};