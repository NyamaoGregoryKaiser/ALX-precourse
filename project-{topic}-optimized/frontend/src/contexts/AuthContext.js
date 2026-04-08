import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login, register } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To check initial auth state

  const navigate = useNavigate();

  const loadUserFromToken = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      // Check for token expiration
      if (decoded.exp * 1000 < Date.now()) {
        console.warn('Token expired.');
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
      setUser({
        id: decoded.id,
        username: decoded.username, // Assuming username is in token, or fetch from API
        email: decoded.email, // Assuming email is in token
        role: decoded.role,
      });
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Failed to decode token:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUserFromToken(token);
    }
    setLoading(false);
  }, [loadUserFromToken]);

  const handleLogin = async (email, password) => {
    try {
      const response = await login(email, password);
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      // For simplicity, we just use decoded token, but actual user data from response could be richer
      setUser({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      });
      setIsAuthenticated(true);
      navigate('/products');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      const response = await register(username, email, password);
      // After registration, user typically logs in or is redirected to login
      navigate('/login');
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```