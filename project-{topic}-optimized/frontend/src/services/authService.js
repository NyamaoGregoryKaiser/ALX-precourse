import api from './api';

export const register = (username, email, password) => {
  return api.post('/auth/register', { username, email, password });
};

export const login = (email, password) => {
  return api.post('/auth/login', { email, password });
};

// Placeholder for refresh token if implemented
// export const refreshToken = (refreshToken) => {
//   return api.post('/auth/refresh-token', { refreshToken });
// };
```