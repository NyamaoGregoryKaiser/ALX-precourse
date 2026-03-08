```typescript
// Shared Types for Frontend

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  owner_id: number;
  owner: User;
  members: User[];
  created_at: string;
}

export interface Message {
  id: number;
  chat_room_id: number;
  sender_id: number;
  sender: User;
  content: string;
  sent_at: string;
}

// WebSocket Message Types (Frontend interpretation)
export type WebSocketMessageType = Message | SystemMessage;

export interface SystemMessage {
  type: 'system';
  content: string;
  room_id: number;
  sender?: Partial<User>; // Simplified user info for system messages
  sent_at: string; // ISO format datetime string
}


export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void; // For updating user profile
}

export interface LoginFormFields {
  username: string;
  password: string;
}

export interface RegisterFormFields extends LoginFormFields {
  email: string;
  full_name?: string;
}

export interface MessagePayload {
  content: string;
}

// WebSocket Context Types
export interface WebSocketContextType {
  isConnected: boolean;
  messages: WebSocketMessageType[];
  lastMessage: WebSocketMessageType | null;
  sendMessage: (message: string) => void;
  connect: (roomId: number, token: string) => void;
  disconnect: () => void;
  clearMessages: () => void;
}

export interface RoomListItemProps {
  room: ChatRoom;
  onSelectRoom: (roomId: number) => void;
  isActive: boolean;
}

export interface MessageBubbleProps {
  message: WebSocketMessageType;
  isSender: boolean;
}
```