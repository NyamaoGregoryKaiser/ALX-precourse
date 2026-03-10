export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  isOnline?: boolean;
}

export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  user: User; // Populated user object
  conversationId: string;
  joinedAt: string;
  lastSeen?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: User; // Populated user object
  conversationId: string;
  sentAt: string;
  readAt?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
  lastMessage?: Message; // For display in conversation list
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface SocketMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
  };
  conversationId: string;
  sentAt: string;
}

export interface SocketUserStatus {
  userId: string;
  isOnline: boolean;
}