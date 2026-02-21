import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosConfig';
import Cookies from 'js-cookie';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserFromToken = async () => {
      try {
        const token = Cookies.get('jwt');
        if (token) {
          // Verify token by fetching user profile
          const response = await axiosInstance.get('/users/me');
          setUser(response.data.data.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to authenticate user from token:', error);
        Cookies.remove('jwt'); // Remove invalid token
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromToken();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      Cookies.set('jwt', token, { expires: 1 }); // Store token for 1 day
      setUser(userData);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/register', { username, email, password });
      const { token, user: userData } = response.data;
      Cookies.set('jwt', token, { expires: 1 }); // Store token for 1 day
      setUser(userData);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove('jwt');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};