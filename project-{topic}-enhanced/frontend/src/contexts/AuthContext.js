```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/apiService'; // Your API service for backend calls
import Spinner from '../components/UI/Spinner';
import { jwtDecode } from 'jwt-decode'; // npm install jwt-decode

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwtToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserFromToken = async () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          // Check if token is expired
          if (decodedToken.exp * 1000 < Date.now()) {
            console.log('Token expired, logging out.');
            logout();
            return;
          }
          // In a real app, you might want to call /api/v1/users/me to get fresh user data
          // For now, we'll just reconstruct user from token and local storage or make a quick call.
          // Example:
          const res = await api.get('/users/me'); // Assuming an API endpoint to get current user
          setUser(res.data.data.user);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Set default header for axios
        } catch (error) {
          console.error('Error decoding or verifying token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUserFromToken();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const newToken = res.data.token;
      localStorage.setItem('jwtToken', newToken);
      setToken(newToken);
      // Reload user from token in effect or fetch from /users/me
      const userRes = await api.get('/users/me');
      setUser(userRes.data.data.user);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return true;
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.post('/auth/register', userData);
      const newToken = res.data.token;
      localStorage.setItem('jwtToken', newToken);
      setToken(newToken);
      const userRes = await api.get('/users/me');
      setUser(userRes.data.data.user);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return true;
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    // Optionally call backend logout endpoint
    api.get('/auth/logout').catch(err => console.error('Backend logout failed:', err));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {loading ? <Spinner /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```