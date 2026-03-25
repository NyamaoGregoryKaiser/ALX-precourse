```typescript
import { User } from '../database/entities/User';
import { Request } from 'express';

export interface AuthPayload {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JwtToken {
  token: string;
  expires: Date;
}

export interface Tokens {
  accessToken: JwtToken;
  refreshToken: JwtToken;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Socket.IO event types
export interface SocketJoinRoomPayload {
  roomId: string;
  userId: string;
  username: string;
}

export interface SocketSendMessagePayload {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
}

export interface SocketMessageReceivedPayload extends ChatMessage {}

export interface SocketUserEventPayload {
  roomId: string;
  userId: string;
  username: string;
}

export interface SocketTypingPayload {
  roomId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}
```