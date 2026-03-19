```typescript
// Shared types across frontend (and ideally backend too via shared types package)

export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: Category;
  images: string[]; // URLs to images
  ratingsAverage?: number;
  ratingsQuantity?: number;
  seller?: User; // Optional, can be populated
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock: number; // Current stock available (for validation)
}

export interface Cart {
  id: string; // Not strictly needed for UI-level cart, but useful if persisting server-side
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string;
  user: User;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
  results?: number;
  total?: number;
  stack?: string; // Only in dev for errors
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}
```