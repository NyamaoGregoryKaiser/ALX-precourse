```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface ChatMember {
  id: number;
  chat_id: number;
  user_id: number;
  joined_at: string;
  user: User; // Nested user object
}

export interface Chat {
  id: number;
  name: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  members: ChatMember[];
}

export interface Message {
  id: number;
  chat_id: number;
  owner_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  owner: User; // Nested user object
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DecodedToken {
  sub: string; // User ID
  exp: number; // Expiration timestamp
}
```