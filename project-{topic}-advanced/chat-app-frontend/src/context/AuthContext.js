```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import * as authService from '../services/auth.service'; // Import auth service

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // Store user details (username, id, roles etc.)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('jwtToken');
    if (token) {
      // Validate token or fetch user profile on app load
      authService.getCurrentUser()
        .then(userData => {
          setIsAuthenticated(true);
          setUser(userData);
        })
        .catch(() => {
          // Token invalid or expired, clear it
          Cookies.remove('jwtToken');
          setIsAuthenticated(false);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authService.authenticate(username, password);
      Cookies.set('jwtToken', response.token, { expires: 7 }); // Store token for 7 days
      setIsAuthenticated(true);
      // Fetch user profile after login to populate user state
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await authService.register(username, email, password);
      Cookies.set('jwtToken', response.token, { expires: 7 });
      setIsAuthenticated(true);
      const userData = await authService.getCurrentUser();
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    Cookies.remove('jwtToken');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Provide user ID and username via context
  const userId = user ? user.id : null;
  const username = user ? user.username : null;


  return (
    <AuthContext.Provider value={{ isAuthenticated, user, userId, username, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
```