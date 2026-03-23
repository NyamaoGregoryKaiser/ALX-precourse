```typescript
import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').max(50, 'Username cannot exceed 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Chat Room Schemas
export const createChatRoomSchema = z.object({
  name: z.string().min(3, 'Chat room name must be at least 3 characters').max(100, 'Chat room name cannot exceed 100 characters'),
  description: z.string().max(255, 'Description cannot exceed 255 characters').optional(),
});

export const joinChatRoomSchema = z.object({
  chatRoomId: z.string().uuid('Invalid chat room ID format'),
});

// Message Schema
export const sendMessageSchema = z.object({
  chatRoomId: z.string().uuid('Invalid chat room ID format'),
  senderId: z.string().uuid('Invalid sender ID format'),
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message cannot exceed 1000 characters'),
});
```