```javascript
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode'; // Note: jwt-decode typically needs to be imported like this
import authService from '../api/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const checkTokenValidity = useCallback(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000; // in seconds
        if (decodedToken.exp < currentTime) {
          // Token expired
          console.log('Token expired. Logging out.');
          logout();
          return false;
        }
        return true;
      } catch (e) {
        console.error('Invalid token format:', e);
        logout();
        return false;
      }
    }
    return false;
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      if (token && checkTokenValidity()) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          try {
            // Fetch user profile if not in localStorage (or refresh it)
            const profile = await authService.getProfile();
            setUser(profile);
            localStorage.setItem('user', JSON.stringify(profile));
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            logout();
          }
        }
      } else {
        // No token, or token invalid/expired
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token, checkTokenValidity]);

  const login = async (email, password) => {
    try {
      const { user: userData, token: jwtToken } = await authService.login(email, password);
      setToken(jwtToken);
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { user: registeredUser, token: jwtToken } = await authService.register(userData);
      setToken(jwtToken);
      setUser(registeredUser);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setLoading(false); // Ensure loading is false after logout
  };

  const isAuthenticated = !!user && !!token && checkTokenValidity();
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isEditor = isAuthenticated && user?.role === 'editor';
  const isAuthor = isAuthenticated && user?.role === 'author';

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isEditor,
    isAuthor,
    loading,
    login,
    register,
    logout,
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
```