```typescript
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  AUTHOR = 'author',
  READER = 'reader',
}

export enum PostStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  status: PostStatus;
  author: User; // Backend typically sends a stripped-down user object
  category?: Category;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

export interface CreatePostPayload {
  title: string;
  content: string;
  thumbnailUrl?: string;
  status?: PostStatus;
  categoryId?: string;
}

export interface UpdatePostPayload extends Partial<CreatePostPayload> {}
```