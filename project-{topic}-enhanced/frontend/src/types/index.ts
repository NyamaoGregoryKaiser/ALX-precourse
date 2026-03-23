```typescript
// Shared types for frontend
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  participants: {
    userId: string;
    chatRoomId: string;
    user: User;
  }[];
  messages?: Message[]; // Only included when fetching a single room with history
  lastMessage?: Message; // For chat room list preview
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string; // ISO string
}

// WebSocket events
export interface SocketJoinRoomEvent {
  userId: string;
  username: string;
  chatRoomId: string;
}

export interface SocketLeaveRoomEvent extends SocketJoinRoomEvent {}
export interface SocketTypingEvent extends SocketJoinRoomEvent {}
export interface SocketStopTypingEvent extends SocketJoinRoomEvent {}
```