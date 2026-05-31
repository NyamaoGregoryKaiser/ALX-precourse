```typescript
import api from './api';
import { Post, CreatePostPayload, UpdatePostPayload, PostStatus, Category } from '../types';

export const getPosts = async (status?: PostStatus): Promise<Post[]> => {
  const params = status ? { status } : {};
  const response = await api.get<Post[]>('/posts', { params });
  return response.data;
};

export const getPostById = async (id: string): Promise<Post> => {
  const response = await api.get<Post>(`/posts/${id}`);
  return response.data;
};

export const createPost = async (postData: CreatePostPayload): Promise<Post> => {
  const response = await api.post<Post>('/posts', postData);
  return response.data;
};

export const updatePost = async (id: string, postData: UpdatePostPayload): Promise<Post> => {
  const response = await api.patch<Post>(`/posts/${id}`, postData);
  return response.data;
};

export const deletePost = async (id: string): Promise<void> => {
  await api.delete(`/posts/${id}`);
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get<Category[]>('/categories');
  return response.data;
};
```