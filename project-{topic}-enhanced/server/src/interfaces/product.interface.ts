import { Product } from '@/entities/Product';

export type ProductResponse = Omit<Product, 'createdAt' | 'updatedAt'>;

export type CreateProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateProductPayload = Partial<CreateProductPayload>;