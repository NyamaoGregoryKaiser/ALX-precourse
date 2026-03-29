import api from './api';
import { IProduct } from '@/types/auth.d'; // Using IProduct from auth.d.ts

export const getAllProducts = async (): Promise<IProduct[]> => {
  const response = await api.get('/products');
  return response.data;
};

export const getProductById = async (id: string): Promise<IProduct> => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (productData: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<IProduct> => {
  const response = await api.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id: string, updateData: Partial<Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IProduct> => {
  const response = await api.patch(`/products/${id}`, updateData);
  return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};