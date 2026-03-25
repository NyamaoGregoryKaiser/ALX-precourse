import axios from 'axios';
import { ChatRoom, Message, User } from '../types/chat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const chatApi = axios.create({
  baseURL: `${API_BASE_URL}/chat-rooms`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setChatAuthToken = (token: string | null) => {
  if (token) {
    chatApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete chatApi.defaults.headers.common['Authorization'];
  }
};

export const getUserChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await chatApi.get('/');
  return response.data;
};

export const getChatRoomMessages = async (roomId: string, limit: number = 50, offset: number = 0): Promise<Message[]> => {
  const response = await chatApi.get(`/${roomId}/messages`, {
    params: { limit, offset },
  });
  return response.data;
};

export const createChatRoom = async (name: string | undefined, type: 'private' | 'group', participantIds: string[]): Promise<{ chatRoom: ChatRoom }> => {
  const response = await chatApi.post('/', { name, type, participantIds });
  return response.data;
};

export const getChatRoomDetails = async (roomId: string): Promise<ChatRoom> => {
  const response = await chatApi.get(`/${roomId}`);
  return response.data;
};

export const getAllUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${API_BASE_URL}/users`);
  return response.data;
};

export const addParticipantToRoom = async (roomId: string, userIdToAdd: string): Promise<{ chatRoom: ChatRoom }> => {
  const response = await chatApi.post(`/${roomId}/participants`, { userIdToAdd });
  return response.data;
};

export const removeParticipantFromRoom = async (roomId: string, userIdToRemove: string): Promise<void> => {
  await chatApi.delete(`/${roomId}/participants/${userIdToRemove}`);
};

export const deleteChatRoom = async (roomId: string): Promise<void> => {
  await chatApi.delete(`/${roomId}`);
};

export default chatApi;