import { Product, Category } from '@prisma/client';

// Define specific types for DTOs if needed, or use Prisma's generated types directly.
// This example shows how you might augment or define new types.

export type CreateProductDTO = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  imageUrl?: string;
};

export type UpdateProductDTO = Partial<CreateProductDTO>;

// Example of a response type that includes category details
export type ProductWithCategory = Product & { category: Category };