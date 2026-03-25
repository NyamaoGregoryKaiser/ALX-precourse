import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { ClientToServerEvents, ServerToClientEvents, Message, ChatRoom, TypingIndicator } from '../types/chat';

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  typingUsers: TypingIndicator[];
  currentRoomData: ChatRoom | null; // Full data for the currently active room
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (chatRoomId: string, content: string) => void;
  sendTypingStart: (roomId: string) => void;
  sendTypingStop: (roomId: string) => void;
  markMessageRead: (messageId: string, roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const WS_BASE_URL = process.env.REACT_APP_WS_BASE_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, accessToken, user, logout } = useAuth();
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [currentRoomData, setCurrentRoomData] = useState<ChatRoom | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(WS_BASE_URL, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
            // The server explicitly disconnected or connection lost, might need to re-authenticate
            // Or if due to invalid auth, force logout
            if (reason === 'io server disconnect') {
                // If server explicitly disconnected due to invalid auth, we might need to clear session
                // This implies the server emitted a disconnect with a reason code for auth failure.
                // For now, if isAuthenticated is still true, we could try to refresh token.
                // Or simply let AuthContext's effect handle re-auth on next API call/page refresh.
            }
        }
      });

      newSocket.on('receive_message', (message) => {
        console.log('Received message:', message);
        setMessages((prevMessages) => {
          // Avoid duplicates if message is already there (e.g., from optimistic update)
          if (prevMessages.some(m => m.id === message.id)) {
            return prevMessages;
          }
          return [...prevMessages, message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        // Clear typing indicator for this sender if they were typing
        setTypingUsers(prev => prev.filter(tu => tu.userId !== message.senderId && tu.roomId === message.chatRoomId));
      });

      newSocket.on('user_joined_room', (data) => {
        console.log(`User ${data.username} joined room ${data.roomId}`);
        // Optionally update UI for user list
      });

      newSocket.on('user_left_room', (data) => {
        console.log(`User ${data.username} left room ${data.roomId}`);
        // Optionally update UI for user list
      });

      newSocket.on('typing_start', (data) => {
        if (data.userId !== user?.id) { // Don't show typing for self
          setTypingUsers(prev => {
            if (!prev.some(tu => tu.userId === data.userId && tu.roomId === data.roomId)) {
              return [...prev, data];
            }
            return prev;
          });
        }
      });

      newSocket.on('typing_stop', (data) => {
        setTypingUsers(prev => prev.filter(tu => tu.userId !== data.userId || tu.roomId !== data.roomId));
      });

      newSocket.on('message_read', ({ messageId, readerId, roomId }) => {
        console.log(`Message ${messageId} in room ${roomId} read by ${readerId}`);
        setMessages(prevMessages => prevMessages.map(msg => {
            if (msg.id === messageId) {
                const newReadBy = [...new Set([...msg.readBy, readerId])];
                return { ...msg, isRead: newReadBy.includes(user!.id), readBy: newReadBy };
            }
            return msg;
        }));
      });

      newSocket.on('room_updated', (room) => {
          console.log('Room updated received:', room);
          if (currentRoomData && currentRoomData.id === room.id) {
            setCurrentRoomData(prev => prev ? { ...prev, ...room } : room); // Merge updates
          }
      })

      newSocket.on('error', (errorMessage) => {
        console.error('Socket Error:', errorMessage);
        // Handle specific errors, e.g., authentication failures from socket middleware
        if (errorMessage.includes('Authentication token expired') || errorMessage.includes('Invalid authentication token')) {
            console.warn('Socket authentication error detected. Forcing logout.');
            logout(); // Force logout if socket auth fails
        }
      });


      setSocket(newSocket);

      return () => {
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('receive_message');
        newSocket.off('user_joined_room');
        newSocket.off('user_left_room');
        newSocket.off('typing_start');
        newSocket.off('typing_stop');
        newSocket.off('message_read');
        newSocket.off('room_updated');
        newSocket.off('error');
        newSocket.disconnect();
        setIsConnected(false);
        setSocket(null);
        setMessages([]); // Clear messages on disconnect
        setTypingUsers([]);
        setCurrentRoomData(null);
      };
    } else if (!isAuthenticated && socket) {
      socket.disconnect(); // Disconnect if user logs out
      setSocket(null);
      setIsConnected(false);
      setMessages([]);
      setTypingUsers([]);
      setCurrentRoomData(null);
    }
  }, [isAuthenticated, accessToken, user?.id, logout, socket, currentRoomData]); // Added socket and currentRoomData to deps

  const joinRoom = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', { roomId });
    }
  }, [socket, isConnected]);

  const leaveRoom = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', { roomId });
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((chatRoomId: string, content: string) => {
    if (socket && isConnected && content.trim() && user) {
      // Optimistic update: Add message to local state immediately
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempMessageId,
        chatRoomId,
        senderId: user.id,
        senderUsername: user.username,
        content,
        createdAt: new Date().toISOString(),
        isRead: false,
        readBy: [],
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      socket.emit('send_message', { chatRoomId, content });
    }
  }, [socket, isConnected, user]);

  const sendTypingStart = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { roomId });
    }
  }, [socket, isConnected]);

  const sendTypingStop = useCallback((roomId: string) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { roomId });
    }
  }, [socket, isConnected]);

  const markMessageRead = useCallback((messageId: string, roomId: string) => {
    if (socket && isConnected) {
        socket.emit('mark_message_read', { messageId, roomId });
    }
  }, [socket, isConnected]);


  const contextValue = {
    socket,
    isConnected,
    messages,
    setMessages,
    typingUsers,
    currentRoomData,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    markMessageRead,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};