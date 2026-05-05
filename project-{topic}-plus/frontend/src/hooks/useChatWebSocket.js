import { useEffect, useCallback, useState } from 'react';
import { wsService } from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';

export const useChatWebSocket = (roomId, onNewMessage, onParticipantUpdate) => {
  const { isAuthenticated, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  const jwtToken = localStorage.getItem('jwtToken');

  const connectWebSocket = useCallback(() => {
    if (!jwtToken || !isAuthenticated) {
      console.warn('Not authenticated or no token, cannot connect WebSocket.');
      return;
    }

    if (wsService.isConnected()) {
      setIsConnected(true);
      return;
    }

    wsService.connect(
      jwtToken,
      () => {
        setIsConnected(true);
        console.log('WebSocket connection established and ready for subscriptions.');
        // Subscribe to room-specific topics once connected
        wsService.subscribe(`/topic/room/${roomId}/messages`, onNewMessage);
        wsService.subscribe(`/topic/room/${roomId}/participants`, onParticipantUpdate);
      },
      (error) => {
        console.error('WebSocket connection failed:', error);
        setIsConnected(false);
        if (error.headers && error.headers.message === 'UNAUTHORIZED') {
          console.error('JWT token expired or invalid, logging out...');
          logout();
        }
      }
    );
  }, [jwtToken, isAuthenticated, roomId, onNewMessage, onParticipantUpdate, logout]);

  const disconnectWebSocket = useCallback(() => {
    if (wsService.isConnected()) {
      wsService.unsubscribe(`/topic/room/${roomId}/messages`);
      wsService.unsubscribe(`/topic/room/${roomId}/participants`);
      // Only disconnect the client if it's not needed elsewhere or specifically requested
      // For a single-room app, this is fine. For multi-room, manage subscriptions.
      wsService.disconnect(); 
      setIsConnected(false);
    }
  }, [roomId]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const sendMessage = useCallback((messageContent) => {
    if (isConnected && roomId) {
      const message = {
        roomId: roomId,
        content: messageContent,
      };
      wsService.send('/app/chat.sendMessage', message);
    } else {
      console.warn('WebSocket not connected or no room selected. Cannot send message.');
    }
  }, [isConnected, roomId]);

  return { isConnected, sendMessage };
};