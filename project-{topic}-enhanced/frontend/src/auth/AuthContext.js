```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser } from '../api/auth'; // Assuming these functions handle API calls and local storage for JWT
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load user from local storage (or check validity of JWT)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('jwt');
    if (storedUser && token) {
      // In a real app, you'd verify the token with the backend
      // or ensure it's not expired before setting the user.
      // For this example, we'll assume it's valid if present.
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const data = await loginUser({ email, password });
      localStorage.setItem('jwt', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const register = useCallback(async (name, email, password, role) => {
    try {
      setLoading(true);
      const data = await registerUser({ name, email, password, role });
      localStorage.setItem('jwt', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error.response?.data?.message || error.message);
    }
  }, [navigate]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```