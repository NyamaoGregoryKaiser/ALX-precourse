import axiosInstance from './axiosInstance';

export const getMyChatRooms = async () => {
  try {
    const response = await axiosInstance.get('/api/chatrooms/my-rooms');
    return response.data;
  } catch (error) {
    console.error('Error fetching my chat rooms:', error);
    throw error;
  }
};

export const getAllChatRooms = async () => {
  try {
    const response = await axiosInstance.get('/api/chatrooms');
    return response.data;
  } catch (error) {
    console.error('Error fetching all chat rooms:', error);
    throw error;
  }
};

export const getChatRoomDetails = async (roomId) => {
  try {
    const response = await axiosInstance.get(`/api/chatrooms/${roomId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat room ${roomId} details:`, error);
    throw error;
  }
};

export const createChatRoom = async (roomName) => {
  try {
    const response = await axiosInstance.post('/api/chatrooms', { name: roomName });
    return response.data;
  } catch (error) {
    console.error('Error creating chat room:', error);
    throw error;
  }
};

export const joinChatRoom = async (roomId) => {
  try {
    const response = await axiosInstance.post(`/api/chatrooms/${roomId}/join`);
    return response.data;
  } catch (error) {
    console.error(`Error joining chat room ${roomId}:`, error);
    throw error;
  }
};

export const leaveChatRoom = async (roomId) => {
  try {
    const response = await axiosInstance.post(`/api/chatrooms/${roomId}/leave`);
    return response.data;
  } catch (error) {
    console.error(`Error leaving chat room ${roomId}:`, error);
    throw error;
  }
};

export const getMessageHistory = async (roomId, page = 0, size = 50) => {
  try {
    const response = await axiosInstance.get(`/api/messages/room/${roomId}`, {
      params: { page, size },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching message history for room ${roomId}:`, error);
    throw error;
  }
};

export const getRoomParticipants = async (roomId) => {
  try {
    const response = await axiosInstance.get(`/api/chatrooms/${roomId}/participants`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching participants for room ${roomId}:`, error);
    throw error;
  }
};