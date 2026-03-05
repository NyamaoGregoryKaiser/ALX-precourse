```javascript
import apiClient from './api';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Cookies from 'js-cookie';

const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:8080/websocket';

let stompClient = null;

export const getChatHistory = async (roomId, page = 0, size = 20) => {
  try {
    const response = await apiClient.get(`/messages/room/${roomId}?page=${page}&size=${size}`);
    return response.data; // Page<ChatMessage>
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const connectWebSocket = (onMessageReceived) => {
  const token = Cookies.get('jwtToken');
  if (!token) {
    console.error("JWT token not found. Cannot connect to WebSocket.");
    return;
  }

  // Use SockJS for fallback and `@stomp/stompjs` for client
  stompClient = new Client({
    webSocketFactory: () => new SockJS(WEBSOCKET_URL),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    debug: (str) => {
      // console.log(str); // Uncomment for WebSocket debugging
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: (frame) => {
      console.log('Connected to WebSocket:', frame);
    },
    onStompError: (frame) => {
      console.error('Broker reported error:', frame.headers['message']);
      console.error('Additional details:', frame.body);
    },
    onWebSocketClose: () => {
      console.log('WebSocket connection closed.');
    }
  });

  stompClient.activate();
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    stompClient.deactivate();
    console.log("Disconnected from WebSocket");
  }
};

export const subscribeToRoom = (roomId, onMessageReceived) => {
  if (!stompClient || !stompClient.connected) {
    console.warn("STOMP client not connected, cannot subscribe.");
    return null;
  }

  const subscription = stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
    onMessageReceived(JSON.parse(message.body));
  });
  console.log(`Subscribed to /topic/room/${roomId}`);
  return subscription; // Return subscription object to allow unsubscribing
};

export const sendMessage = (roomId, content) => {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/chat/room/${roomId}`,
      body: content,
    });
  } else {
    console.error("STOMP client not connected, cannot send message.");
  }
};
```