import api from './api';
import { IUser, IRegisterPayload } from '@/types/auth.d';

export const getAllUsers = async (): Promise<IUser[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const getUserById = async (id: string): Promise<IUser> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (userData: IRegisterPayload): Promise<IUser> => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateUser = async (id: string, updateData: Partial<IUser>): Promise<IUser> => {
  const response = await api.patch(`/users/${id}`, updateData);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};