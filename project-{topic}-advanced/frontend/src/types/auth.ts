// From backend Prisma UserRole enum
export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterPayload extends Pick<User, 'name' | 'email' | 'password'> {}
export interface LoginPayload extends Pick<User, 'email' | 'password'> {}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}