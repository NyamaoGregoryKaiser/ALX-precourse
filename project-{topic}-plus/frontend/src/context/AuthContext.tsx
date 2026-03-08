```typescript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AuthState, AuthContextType, User } from 'types';
import { getAuthToken, getUser, saveAuthToken, saveUser, clearAuthData } from 'utils/auth';
import axiosInstance from 'api/axiosInstance';

// Initial state for the authentication context
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading
};

// Create the AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  // Function to fetch current user data from the backend
  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const response = await axiosInstance.get('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData: User = response.data;
      setAuthState({
        user: userData,
        token: token,
        isAuthenticated: true,
        isLoading: false,
      });
      saveUser(userData); // Update user in local storage
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      clearAuthData(); // Clear invalid token/user data
      setAuthState({ ...initialState, isLoading: false }); // Reset auth state
    }
  }, []);

  // Effect to initialize auth state from local storage on component mount
  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getUser(); // May be outdated or null

    if (token) {
      // If token exists, try to validate it and fetch user data
      // This is important because the token might be expired or invalid
      fetchCurrentUser(token);
    } else {
      // No token, so not authenticated
      setAuthState({ ...initialState, isLoading: false });
    }
  }, [fetchCurrentUser]);

  // Login function
  const login = useCallback((token: string, user: User) => {
    saveAuthToken(token);
    saveUser(user);
    setAuthState({
      user: user,
      token: token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  // Logout function
  const logout = useCallback(() => {
    clearAuthData();
    setAuthState({ ...initialState, isLoading: false });
  }, []);

  // Function to update the user in state (e.g., after profile update)
  const setUser = useCallback((user: User) => {
    saveUser(user);
    setAuthState((prevState) => ({
      ...prevState,
      user: user,
    }));
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
```