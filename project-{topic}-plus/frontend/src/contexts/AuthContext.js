```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserFromLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        if (storedUser && accessToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to parse user from local storage:', error);
        localStorage.clear(); // Clear potentially corrupted storage
      } finally {
        setLoading(false);
      }
    };
    loadUserFromLocalStorage();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user: userData, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      navigate('/products');
      return true;
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      throw error; // Re-throw to allow component to display error
    }
  };

  const register = async (username, email, password, role) => {
    try {
      const response = await apiClient.post('/auth/register', { username, email, password, role });
      const { user: userData, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      navigate('/products');
      return true;
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout failed on server:', error);
      // Even if server logout fails, clear client-side data
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      navigate('/login');
    }
  };

  const isAdmin = user?.role === 'admin';

  const authContextValue = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {!loading && children}
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