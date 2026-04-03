```tsx
import { apiSlice } from '../../app/api/apiSlice';
import { LoginDto, RegisterUserDto } from '@backend/auth/dto/auth.dtos'; // Assuming DTOs are shared or re-defined
import { LoginResponse } from '@backend/auth/types/auth.types'; // Assuming types are shared or re-defined

// Re-define DTOs and types for frontend if not shared
interface FrontendLoginDto { username: string; password: string; }
interface FrontendRegisterUserDto { username: string; email: string; password: string; }
interface FrontendLoginResponse { accessToken: string; }

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<FrontendLoginResponse, FrontendLoginDto>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<FrontendLoginResponse, FrontendRegisterUserDto>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
```