export interface User {
  id: string;
  username: string;
  email: string;
  isOnline: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[]; // IDs of users who have read this message
}

export interface ChatRoomParticipant {
  id: string; // User ID
  username: string;
  isOnline?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'private' | 'group';
  createdAt: string;
  updatedAt: string;
  participants: ChatRoomParticipant[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface TypingIndicator {
  roomId: string;
  userId: string;
  username: string;
}

// Socket.IO Events
export interface ServerToClientEvents {
  receive_message: (message: Message) => void;
  user_joined_room: (data: { roomId: string; userId: string; username: string }) => void;
  user_left_room: (data: { roomId: string; userId: string; username: string }) => void;
  typing_start: (data: TypingIndicator) => void;
  typing_stop: (data: TypingIndicator) => void;
  message_read: (data: { messageId: string; readerId: string; roomId: string }) => void;
  room_updated: (room: ChatRoom) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  send_message: (payload: { chatRoomId: string; content: string }) => void;
  join_room: (payload: { roomId: string }) => void;
  leave_room: (payload: { roomId: string }) => void;
  typing_start: (payload: { roomId: string }) => void;
  typing_stop: (payload: { roomId: string }) => void;
  mark_message_read: (payload: { messageId: string; roomId: string }) => void;
}