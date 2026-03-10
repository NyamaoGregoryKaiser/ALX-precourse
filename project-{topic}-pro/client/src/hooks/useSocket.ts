import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket';
import { AuthContextType } from '../auth/AuthContext';
import { SocketMessage, SocketUserStatus } from '../types';

interface UseSocketOptions {
  onMessageReceive?: (message: SocketMessage) => void;
  onUserStatusChange?: (status: SocketUserStatus) => void;
  onError?: (message: string) => void;
}

export const useSocket = (auth: AuthContextType, options?: UseSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const onMessageReceiveRef = useRef(options?.onMessageReceive);
  const onUserStatusChangeRef = useRef(options?.onUserStatusChange);
  const onErrorRef = useRef(options?.onError);

  useEffect(() => {
    onMessageReceiveRef.current = options?.onMessageReceive;
    onUserStatusChangeRef.current = options?.onUserStatusChange;
    onErrorRef.current = options?.onError;
  }, [options?.onMessageReceive, options?.onUserStatusChange, options?.onError]);

  useEffect(() => {
    if (auth.token && !socketRef.current) {
      socketService.initializeSocket(auth.token);
      socketRef.current = socketService.getSocket();

      if (socketRef.current) {
        socketRef.current.on('connect', () => setIsConnected(true));
        socketRef.current.on('disconnect', () => setIsConnected(false));
        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connect_error:', error.message);
          onErrorRef.current?.(`Socket connection error: ${error.message}`);
        });

        socketRef.current.on('message:receive', (message) => {
          console.log('Received message:', message);
          onMessageReceiveRef.current?.(message);
        });

        socketRef.current.on('user:status', (status) => {
          console.log('User status update:', status);
          onUserStatusChangeRef.current?.(status);
        });

        socketRef.current.on('error', (message) => {
          console.error('Socket server error:', message);
          onErrorRef.current?.(message);
        });

        setIsConnected(socketRef.current.connected);
      }
    } else if (!auth.token && socketRef.current) {
      // If token is removed, disconnect the socket
      socketService.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('message:receive');
        socketRef.current.off('user:status');
        socketRef.current.off('error');
      }
    };
  }, [auth.token]); // Re-run effect if token changes

  const sendMessage = (conversationId: string, content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', { conversationId, content });
    } else {
      console.warn('Socket not connected, cannot send message.');
      onErrorRef.current?.('Socket not connected. Please try again.');
    }
  };

  const joinConversationRoom = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:join', conversationId);
    } else {
      console.warn('Socket not connected, cannot join conversation room.');
      onErrorRef.current?.('Socket not connected. Please try again.');
    }
  };

  return { socket: socketRef.current, isConnected, sendMessage, joinConversationRoom };
};