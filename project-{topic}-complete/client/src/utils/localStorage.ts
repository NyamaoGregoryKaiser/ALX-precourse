import { User } from '../types';

const TOKEN_KEY = 'jwtToken';
const USER_KEY = 'user';

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUserData = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUserData = (): User | null => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

export const removeUserData = (): void => {
  localStorage.removeItem(USER_KEY);
};