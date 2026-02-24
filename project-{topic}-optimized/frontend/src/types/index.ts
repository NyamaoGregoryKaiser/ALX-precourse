```typescript
// src/types/index.ts

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  username: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Channel {
  id: number;
  name: string;
  creatorUsername: string;
  createdAt: string; // ISO string
  members: string[]; // List of member usernames
}

export interface Message {
  id?: number; // ID might be null for unsaved messages
  channelId: number;
  senderUsername: string;
  content: string;
  timestamp: string; // ISO string
}

// Decoded JWT payload structure
export interface JwtPayload {
  sub: string; // Subject (username)
  auth: string; // Authorities/roles
  exp: number; // Expiration timestamp (Unix epoch time in seconds)
  iat: number; // Issued at timestamp
}
```