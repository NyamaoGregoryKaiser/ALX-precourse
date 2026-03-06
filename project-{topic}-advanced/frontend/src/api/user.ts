```typescript
import axiosInstance from './axiosConfig';
import { User } from '@context/AuthContext'; // Re-use User type definition

export interface UserProfile extends Omit<User, 'token'> {
  // Add any other user-specific fields that come from the API
  createdAt: string;
  updatedAt: string;
  isEmailVerified: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: string; // Admin-only update
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await axiosInstance.get(`/users/${userId}`);
  return response.data;
};

export const updateProfile = async (userId: string, data: UpdateUserPayload): Promise<{ message: string; user: UserProfile }> => {
  const response = await axiosInstance.patch(`/users/${userId}`, data);
  return response.data;
};

export const changePassword = async (userId: string, data: ChangePasswordPayload): Promise<{ message: string }> => {
  const response = await axiosInstance.patch(`/users/${userId}/change-password`, data);
  return response.data;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const response = await axiosInstance.get('/users');
  return response.data;
};

export const deleteUser = async (userId: string): Promise<{ message: string }> => {
  const response = await axiosInstance.delete(`/users/${userId}`);
  return response.data;
};
```