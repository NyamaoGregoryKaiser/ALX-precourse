```typescript
import { jwtDecode } from 'jwt-decode';
import { JwtPayload } from '../types';

const TOKEN_KEY = 'jwtToken';

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) {
    return false;
  }
  try {
    const decoded = decodeToken(token);
    if (!decoded) {
      return false;
    }
    // Check if token is expired
    return decoded.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
};
```