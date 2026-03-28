"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, registerUser } from '@/lib/api';
import { LoginPayload, RegisterPayload, User } from '@/types/auth'; // Assuming types defined

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (userData: RegisterPayload) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to load user from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      } catch (err) {
        console.error('Failed to parse user from localStorage', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (credentials: LoginPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const { token: newToken, user: userData } = await loginUser(credentials);
      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      // Optionally fetch user profile to ensure it's up-to-date
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err; // Re-throw to allow component to catch and display specific error
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (userData: RegisterPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const { token: newToken, user: newUser } = await registerUser(userData);
      setUser(newUser);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setError(null);
    setIsLoading(false);
  };

  const value = {
    user,
    token,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}