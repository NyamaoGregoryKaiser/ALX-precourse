```typescript
import api from './axiosConfig';
import { Chat, Message } from '../types';

export interface CreateChatData {
  name: string;
  is_group: boolean;
  member_ids: number[];
}

export const getUserChats = async (): Promise<Chat[]> => {
  const response = await api.get<Chat[]>('/chats/');
  return response.data;
};

export const getChatMessages = async (chatId: number): Promise<Message[]> => {
  const response = await api.get<Message[]>(`/messages/chat/${chatId}`);
  return response.data;
};

export const createChat = async (data: CreateChatData): Promise<Chat> => {
  const response = await api.post<Chat>('/chats/', data);
  return response.data;
};

export const sendMessage = async (chatId: number, content: string): Promise<Message> => {
  const response = await api.post<Message>(`/messages/?chat_id=${chatId}`, { content });
  return response.data;
};
```