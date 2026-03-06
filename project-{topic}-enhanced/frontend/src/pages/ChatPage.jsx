```javascript
import React, { useEffect } from 'react';
import ChannelList from '../components/Chat/ChannelList';
import ChatWindow from '../components/Chat/ChatWindow';
import UserList from '../components/Chat/UserList';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';

function ChatPage() {
  const { fetchChannels } = useChat();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchChannels();
    }
  }, [isAuthenticated, authLoading, fetchChannels]);

  if (authLoading) {
    return (
      <div className="chat-page">
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <ChannelList />
      <ChatWindow />
      <UserList />
    </div>
  );
}

export default ChatPage;
```