```typescript
export const TOKEN_KEY = 'jwt_token';
export const USER_KEY = 'auth_user';

export const saveAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const saveUser = (user: any) => { // Use 'any' or specific User type
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): any | null => { // Use 'any' or specific User type
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const clearAuthData = () => {
  removeAuthToken();
  removeUser();
};
```