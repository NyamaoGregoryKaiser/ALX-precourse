```javascript
import apiClient from './apiClient';

const messagesApi = {
  sendMessage: (channelId, content) => apiClient.post(`/messages/${channelId}`, { content }),
  getChannelMessages: (channelId, limit = 50, cursor = null) => {
    let url = `/messages/${channelId}?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    return apiClient.get(url);
  },
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),
};

export default messagesApi;
```