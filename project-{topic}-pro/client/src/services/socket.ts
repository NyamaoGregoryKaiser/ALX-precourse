import { io, Socket } from 'socket.io-client';
import { config } from '../config'; // Assuming you have a config file for frontend too
import { SocketMessage, SocketUserStatus } from '../types';

interface ClientToServerEvents {
  'message:send': (data: { conversationId: string; content: string }) => void;
  'conversation:join': (conversationId: string) => void;
}

interface ServerToClientEvents {
  'message:receive': (message: SocketMessage) => void;
  'user:status': (status: SocketUserStatus) => void;
  'error': (message: string) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private token: string | null = null;

  initializeSocket(token: string): void {
    if (this.socket && this.socket.connected && this.token === token) {
      console.log('Socket already initialized and connected with the same token.');
      return;
    }

    this.token = token;
    this.disconnect(); // Disconnect existing socket if token changed or re-initialization

    this.socket = io(config.apiUrl, {
      auth: {
        token: this.token,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Handle reconnection logic if needed
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('error', (message) => {
      console.error('Socket server error:', message);
    });
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Call initializeSocket first.');
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      console.log('Socket disconnected and cleared.');
    }
  }
}

export const socketService = new SocketService();