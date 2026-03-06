```javascript
import apiClient from './apiClient';

const channelsApi = {
  createChannel: (channelData) => apiClient.post('/channels', channelData),
  getAllChannels: () => apiClient.get('/channels'),
  getChannelById: (channelId) => apiClient.get(`/channels/${channelId}`),
  joinChannel: (channelId) => apiClient.post(`/channels/${channelId}/join`),
  leaveChannel: (channelId) => apiClient.post(`/channels/${channelId}/leave`),
  getChannelMembers: (channelId) => apiClient.get(`/channels/${channelId}/members`),
  deleteChannel: (channelId) => apiClient.delete(`/channels/${channelId}`),
};

export default channelsApi;
```