```javascript
import apiClient from './api';

export const getAllRooms = async (page = 0, size = 10) => {
  try {
    const response = await apiClient.get(`/rooms?page=${page}&size=${size}`);
    return response.data; // Page<RoomDto>
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getMyRooms = async (page = 0, size = 10) => {
  try {
    const response = await apiClient.get(`/rooms/my-rooms?page=${page}&size=${size}`);
    return response.data; // Page<RoomDto>
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getRoomById = async (roomId) => {
  try {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return response.data; // RoomDto
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createRoom = async (name, description) => {
  try {
    const response = await apiClient.post('/rooms', { name, description });
    return response.data; // RoomDto
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const joinRoom = async (roomId) => {
  try {
    const response = await apiClient.post(`/rooms/${roomId}/join`);
    return response.data; // RoomDto
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const leaveRoom = async (roomId) => {
  try {
    const response = await apiClient.post(`/rooms/${roomId}/leave`);
    return response.data; // RoomDto
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteRoom = async (roomId) => {
  try {
    await apiClient.delete(`/rooms/${roomId}`);
    return true;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
```