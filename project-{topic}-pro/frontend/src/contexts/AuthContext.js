```javascript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUserFromStorage = useCallback(async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user'); // Store basic user info for quicker load

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate token by fetching user profile
        const fetchedUser = await authService.getMe();
        if (fetchedUser && fetchedUser.id === parsedUser.id) {
          setUser(fetchedUser);
        } else {
          // Token invalid or user mismatch, clear and log out
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to load user or validate token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const data = await authService.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user)); // Store minimal user data
      setUser(data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      throw error; // Re-throw to be caught by the login form
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password, role = 'developer') => {
    try {
      setLoading(true);
      const data = await authService.register({ username, email, password, role });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```