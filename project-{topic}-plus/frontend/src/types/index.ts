```typescript
// src/types/index.ts

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  sender: Pick<User, 'id' | 'username'>; // Nested sender object for display
}

export interface ConversationParticipant extends Pick<User, 'id' | 'username' | 'status'> {
  // Add any other participant-specific fields if needed
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage?: Pick<Message, 'id' | 'senderId' | 'content' | 'createdAt'> | null;
}
```