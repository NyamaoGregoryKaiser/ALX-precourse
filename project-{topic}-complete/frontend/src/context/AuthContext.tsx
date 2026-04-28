import React, { createContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { API } from '../api/api';
import { User, LoginResponse } from '../utils/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = Cookies.get('jwtToken');
    if (storedToken) {
      setToken(storedToken);
      // Attempt to fetch user profile using the token
      API.get<Omit<User, 'password'>>('/auth/profile', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((response) => {
          // Explicitly cast to User, assuming password is not returned
          setUser(response.data as User);
        })
        .catch(() => {
          console.error('Failed to fetch user profile, logging out.');
          logout(); // Token might be invalid or expired
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (jwtToken: string, userData: User) => {
    Cookies.set('jwtToken', jwtToken, { expires: 7 }); // Store token for 7 days
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove('jwtToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};