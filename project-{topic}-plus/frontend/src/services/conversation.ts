```typescript
import api from './api';
import { Conversation } from '../types';

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await api.get('/conversations');
  return response.data;
};

export const getConversationById = async (conversationId: string): Promise<Conversation> => {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
};

export const createConversation = async (participantIds: string[], name?: string): Promise<Conversation> => {
  const response = await api.post('/conversations', { participantIds, name });
  return response.data.conversation;
};
```