```typescript
import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketContextType, WebSocketMessageType, SystemMessage, Message } from 'types';
import { useAuth } from 'hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Base URL for the WebSocket endpoint
const WS_BASE_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8000/api/v1/ws';

// Initial state for the WebSocket context
const initialState: WebSocketContextType = {
  isConnected: false,
  messages: [],
  lastMessage: null,
  sendMessage: () => { console.warn('WebSocket not connected'); },
  connect: () => { console.warn('Connect function not implemented'); },
  disconnect: () => { console.warn('Disconnect function not implemented'); },
  clearMessages: () => { console.warn('Clear messages function not implemented'); },
};

// Create the WebSocketContext
export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// WebSocketProvider component
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<WebSocketMessageType[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessageType | null>(null);
  const currentRoomId = useRef<number | null>(null);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  const connect = useCallback((roomId: number, jwtToken: string) => {
    if (!jwtToken) {
      console.error('Cannot connect to WebSocket: No JWT token provided.');
      return;
    }
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      if (currentRoomId.current === roomId) {
        console.log(`Already connected to room ${roomId}.`);
        return;
      } else {
        // Disconnect from old room before connecting to new one
        console.log(`Disconnecting from room ${currentRoomId.current} to connect to ${roomId}.`);
        ws.current.close();
      }
    }

    currentRoomId.current = roomId;
    console.log(`Attempting to connect to WebSocket for room ${roomId} with token...`);
    // Pass JWT token as a query parameter for WebSocket authentication
    const websocketUrl = `${WS_BASE_URL}?room_id=${roomId}&token=${jwtToken}`;
    const newWs = new WebSocket(websocketUrl);

    newWs.onopen = () => {
      console.log(`WebSocket connected to room ${roomId}`);
      setIsConnected(true);
      // clearMessages(); // Optionally clear messages on new room connect
    };

    newWs.onmessage = (event) => {
      try {
        const parsedMessage: WebSocketMessageType = JSON.parse(event.data);
        console.log('WS Message received:', parsedMessage);
        setMessages((prevMessages) => [parsedMessage, ...prevMessages]); // Add new messages to the top (for reversed list)
        setLastMessage(parsedMessage);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e, event.data);
      }
    };

    newWs.onclose = (event) => {
      console.log(`WebSocket disconnected from room ${roomId}. Code: ${event.code}, Reason: ${event.reason}`);
      setIsConnected(false);
      if (event.code === 1008 || event.code === 1000) { // 1008: Policy Violation (e.g., auth failed), 1000: Normal Closure
        // If auth failed or room not found, navigate away or show error
        if (event.reason.includes("Authentication failed") || event.reason.includes("Not authorized to join this room")) {
            console.error("WebSocket auth/room error:", event.reason);
            navigate('/'); // Redirect to home or login
        }
      }
      currentRoomId.current = null;
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
      // setIsConnected(false); // Error doesn't necessarily mean disconnect immediately
    };

    ws.current = newWs;
  }, [navigate]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      console.log(`Disconnecting WebSocket from room ${currentRoomId.current}`);
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
      currentRoomId.current = null;
    }
  }, []);

  // Note: For this setup, actual message sending goes via REST API,
  // and WS is used for receiving. If clients were to send directly via WS:
  const sendMessage = useCallback((message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  const contextValue: WebSocketContextType = {
    isConnected,
    messages,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    clearMessages,
  };

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
};
```