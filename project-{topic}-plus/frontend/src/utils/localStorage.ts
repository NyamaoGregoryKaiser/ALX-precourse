```typescript
// src/utils/localStorage.ts

const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

export const saveAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY); // Also remove user data on logout
};

// Optional: Save/Get user data if you don't always want to fetch it
// export const saveUserData = (user: any): void => {
//   localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
// };

// export const getUserData = (): any | null => {
//   const data = localStorage.getItem(USER_DATA_KEY);
//   return data ? JSON.parse(data) : null;
// };
```