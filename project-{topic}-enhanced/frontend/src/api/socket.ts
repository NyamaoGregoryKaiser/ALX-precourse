```typescript
import { io, Socket } from 'socket.io-client';
import { Message } from 'types';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found for WebSocket connection.');
      // Handle this error appropriately, e.g., redirect to login
      throw new Error('Authentication token missing.');
    }

    socket = io(WS_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'], // Prioritize websocket
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Handle server-side disconnects or transport issues
        // e.g., prompt user to refresh or try again, clear session if token invalid
      }
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      if (err.message === 'Authentication failed: Invalid or expired token' || err.message === 'Authentication token missing.') {
        // Clear token and redirect to login if auth fails on connect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected.');
  }
};
```