```typescript
import api from './api';
import { Message } from '../types';

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const response = await api.get(`/conversations/${conversationId}/messages`);
  return response.data;
};

// This is a REST fallback for sending messages. In a real-time app,
// messages are primarily sent via WebSockets (Socket.IO).
export const sendMessage = async (conversationId: string, content: string): Promise<Message> => {
  const response = await api.post(`/conversations/${conversationId}/messages`, { content });
  return response.data.message;
};
```