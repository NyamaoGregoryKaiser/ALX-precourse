import React, { createContext, useState, useEffect, useCallback } from 'react';
import { IAuthContext, ILoginPayload, IRegisterPayload, IAuthTokens, IUser } from '@/types/auth.d';
import * as authService from '@/services/auth.service';
import { setAuthTokens, getAuthTokens, clearAuthTokens } from '@/utils/authHelpers';
import { toast } from 'react-toastify';
import logger from '@/utils/logger';

const AuthContext = createContext<IAuthContext | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchUserOnLoad = useCallback(async () => {
    setLoading(true);
    const tokens = getAuthTokens();
    if (!tokens || !tokens.accessToken) {
      clearAuthTokens();
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      // Attempt to get user profile, this will implicitly validate access token
      const userProfile = await authService.getCurrentUserProfile(tokens.accessToken);
      if (userProfile) {
        setUser(userProfile);
        setIsAuthenticated(true);
        logger.info('User session restored.');
      } else {
        // If access token is invalid, try refreshing
        if (tokens.refreshToken) {
          logger.info('Access token invalid, attempting to refresh...');
          const { user: refreshedUser, tokens: newTokens } = await authService.refreshTokens(tokens.refreshToken);
          setAuthTokens(newTokens);
          setUser(refreshedUser);
          setIsAuthenticated(true);
          logger.info('Tokens refreshed and session restored.');
        } else {
          throw new Error('No refresh token available to restore session.');
        }
      }
    } catch (err: any) {
      logger.error('Failed to restore session:', err.message);
      clearAuthTokens();
      setUser(null);
      setIsAuthenticated(false);
      // Only set error if it's not due to simple lack of tokens or a silent failure
      if (err.response?.data?.message && err.response.status !== 401) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchUserOnLoad();
  }, [fetchUserOnLoad]);

  const login = async (credentials: ILoginPayload) => {
    setLoading(true);
    try {
      const { user: loggedInUser, tokens } = await authService.login(credentials);
      setAuthTokens(tokens);
      setUser(loggedInUser);
      setIsAuthenticated(true);
      toast.success('Login successful!');
      return loggedInUser;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed.';
      setError(msg);
      toast.error(msg);
      throw err; // Re-throw to allow component to handle
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: IRegisterPayload) => {
    setLoading(true);
    try {
      const { user: registeredUser, tokens } = await authService.register(userData);
      setAuthTokens(tokens);
      setUser(registeredUser);
      setIsAuthenticated(true);
      toast.success('Registration successful!');
      return registeredUser;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const tokens = getAuthTokens();
      if (tokens?.refreshToken) {
        await authService.logout(tokens.refreshToken);
      }
      clearAuthTokens();
      setUser(null);
      setIsAuthenticated(false);
      toast.info('Logged out successfully.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Logout failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updateData: Partial<IUser>) => {
    if (!isAuthenticated || !user?.id) {
      setError('Not authenticated.');
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await authService.updateCurrentUserProfile(user.id, updateData);
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
      return updatedUser;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Profile update failed.';
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, error, clearError, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;