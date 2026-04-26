```javascript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as apiLogin, register as apiRegister } from '../api/auth';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUserFromToken = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = jwtDecode(token);
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.user_id, // Assuming user_id is in token payload
            email: decoded.sub,
            username: decoded.username, // Assuming username is in token payload
            role: decoded.role,     // Assuming role is in token payload
            token: token,
          });
        } else {
          console.log("Token expired.");
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  const login = async (credentials) => {
    try {
      const response = await apiLogin(credentials);
      const token = response.access_token;
      localStorage.setItem('token', token);
      loadUserFromToken();
      navigate('/dashboard');
      return true;
    } catch (error) {
      console.error("Login failed:", error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      await apiRegister(userData);
      navigate('/login'); // Redirect to login after successful registration
      return true;
    } catch (error) {
      console.error("Registration failed:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const isAuthenticated = !!user;

  const hasRole = (requiredRoles) => {
    if (!user || !user.role) return false;
    if (requiredRoles === null || requiredRoles.length === 0) return true; // No specific roles required
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, hasRole, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

This comprehensive structure provides a solid foundation for a production-ready task management system, addressing all the specified requirements with a focus on enterprise-grade practices.