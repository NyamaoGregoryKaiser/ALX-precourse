import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface ServerToClientEvents {
  receive_message: (message: MessagePayload) => void;
  user_joined_room: (data: { roomId: string; userId: string; username: string }) => void;
  user_left_room: (data: { roomId: string; userId: string; username: string }) => void;
  typing_start: (data: { roomId: string; userId: string; username: string }) => void;
  typing_stop: (data: { roomId: string; userId: string; username: string }) => void;
  message_read: (data: { messageId: string; readerId: string; roomId: string }) => void;
  room_updated: (room: ChatRoomPayload) => void; // When a new participant joins, or name changes
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  send_message: (payload: SendMessagePayload) => void;
  join_room: (payload: { roomId: string }) => void;
  leave_room: (payload: { roomId: string }) => void;
  typing_start: (payload: { roomId: string }) => void;
  typing_stop: (payload: { roomId: string }) => void;
  mark_message_read: (payload: { messageId: string; roomId: string }) => void;
}

export interface InterServerEvents {
  // Define events for communication between servers in a distributed setup (e.g., Redis adapter)
}

export interface SocketData {
  userId: string;
  username: string;
  roomIds: string[]; // List of rooms the user is currently connected to via this socket
}

// Payload types for socket events
export interface MessagePayload {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[]; // User IDs who have read this message
}

export interface SendMessagePayload {
  chatRoomId: string;
  content: string;
}

export interface ChatRoomPayload {
  id: string;
  name: string;
  type: 'private' | 'group';
  participants: Array<{ id: string; username: string }>;
  lastMessage?: MessagePayload;
  unreadCount?: number; // for current user
}