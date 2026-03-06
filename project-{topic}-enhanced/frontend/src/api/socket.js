```javascript
import { io } from 'socket.io-client';
import config from '../config';

let socket = null;

export const connectSocket = (token) => {
  if (!socket || !socket.connected) {
    socket = io(config.socketIoUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket'], // Prefer WebSocket
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      // Handle automatic re-connection in Socket.IO client library
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      // This is often due to invalid auth token
      if (err.message === 'Authentication required for WebSocket' || err.message.includes('token')) {
        console.error('Invalid or expired WebSocket token. Forcing logout.');
        // This is where you might trigger a global logout or token refresh flow
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        window.location.href = '/';
      }
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not initialized. Call connectSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
    console.log('Socket.IO disconnected forcefully.');
  }
};
```