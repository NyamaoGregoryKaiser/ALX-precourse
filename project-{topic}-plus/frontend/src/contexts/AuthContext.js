```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, users } from '../api'; // Your API service
import { jwtDecode } from 'jwt-decode'; // npm i jwt-decode

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (tokens && tokens.access && tokens.access.token) {
          const decodedToken = jwtDecode(tokens.access.token);
          // Check if token is expired
          if (decodedToken.exp * 1000 < Date.now()) {
            // Token expired, attempt refresh or logout
            console.log('Access token expired, attempting refresh...');
            // The axios interceptor should handle this automatically.
            // If it fails, it will redirect to login.
            // For now, assume a successful refresh or simply consider user logged out if initial access token is expired
            setCurrentUser(null);
            localStorage.removeItem('tokens');
            setLoading(false);
            return;
          }
          
          // Get user details from API using the user ID from the token payload
          // This ensures we have the latest user data including role.
          const userId = decodedToken.sub;
          const userProfile = await users.getProfile(userId); // You might need to adjust your user API to allow getting profile by ID
          setCurrentUser(userProfile.data);
        }
      } catch (error) {
        console.error('Failed to load user from localStorage or API:', error);
        localStorage.removeItem('tokens'); // Clear invalid tokens
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    const response = await auth.login(email, password);
    const { user, tokens } = response.data;
    localStorage.setItem('tokens', JSON.stringify(tokens));
    setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    const tokens = JSON.parse(localStorage.getItem('tokens'));
    if (tokens && tokens.refresh && tokens.refresh.token) {
      await auth.logout(tokens.refresh.token);
    }
    localStorage.removeItem('tokens');
    setCurrentUser(null);
  };

  const register = async (username, email, password, role) => {
    const response = await auth.register(username, email, password, role);
    const { user, tokens } = response.data;
    localStorage.setItem('tokens', JSON.stringify(tokens));
    setCurrentUser(user);
    return user;
  };

  const isAdmin = currentUser?.role === 'admin';
  const isEditor = currentUser?.role === 'editor';
  const isViewer = currentUser?.role === 'viewer';
  const isAuthenticated = !!currentUser;

  const value = {
    currentUser,
    isAuthenticated,
    isAdmin,
    isEditor,
    isViewer,
    login,
    logout,
    register,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
```