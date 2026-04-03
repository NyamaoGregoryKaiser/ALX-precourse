```tsx
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';

interface UserPayload {
  userId: string;
  username: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: UserPayload | null;
}

const getInitialState = (): AuthState => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded: UserPayload = jwtDecode(token);
      return { token, user: decoded };
    }
  } catch (error) {
    console.error('Failed to decode token from localStorage:', error);
    localStorage.removeItem('token'); // Clear invalid token
  }
  return { token: null, user: null };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string }>,
    ) => {
      const { accessToken } = action.payload;
      state.token = accessToken;
      state.user = jwtDecode(accessToken);
      localStorage.setItem('token', accessToken);
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
```