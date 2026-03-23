```typescript
import { Request } from 'express';
import { User as PrismaUser } from '@prisma/client';

// Define a type for the authenticated user payload in JWT
export interface JwtPayload {
  id: string;
  email: string;
}

// Extend Express Request to include user data
export interface AuthenticatedRequest extends Request {
  user?: PrismaUser;
}

// WebSocket event types
export interface SocketMessage {
  chatRoomId: string;
  senderId: string;
  content: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  participants: PrismaUser[];
  messages: Message[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatRoomId: string;
  createdAt: Date;
  sender: PrismaUser; // Include sender details
}

// Zod schemas for validation
export { registerSchema, loginSchema, createChatRoomSchema, joinChatRoomSchema, sendMessageSchema } from '../utils/validators';
```