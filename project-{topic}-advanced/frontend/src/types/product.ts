// Matching backend Product type
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  categoryId: string;
  category?: { // Include nested category for display
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}