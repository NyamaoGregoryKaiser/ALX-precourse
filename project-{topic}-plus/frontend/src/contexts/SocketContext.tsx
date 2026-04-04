```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket, io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { config } from '../utils/constants';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (user && token) {
      const newSocket = io(config.SOCKET_URL, {
        auth: {
          token: token,
        },
        transports: ['websocket'], // Prefer WebSocket
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      newSocket.on('error', (data: { message: string }) => {
        console.error('Socket error from server:', data.message);
      });

      setSocket(newSocket);

      return () => {
        console.log('Disconnecting socket...');
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        console.log('User logged out, disconnecting socket...');
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user, token]); // Re-connect if user or token changes

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};
```