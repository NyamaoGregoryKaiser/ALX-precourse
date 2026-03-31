```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import { getUserChats, getChatMessages, sendMessage, createChat } from '../api/chat';
import { Chat, Message } from '../types';
import { toast } from 'react-toastify';

const HomePage: React.FC = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingChats(true);
    try {
      const userChats = await getUserChats();
      setChats(userChats);
      if (userChats.length > 0 && selectedChatId === null) {
        setSelectedChatId(userChats[0].id); // Select the first chat by default
      }
    } catch (error: any) {
      console.error('Failed to fetch chats:', error);
      toast.error(error.response?.data?.detail || 'Failed to load chats.');
    } finally {
      setLoadingChats(false);
    }
  }, [isAuthenticated, selectedChatId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId: number) => {
    setLoadingMessages(true);
    try {
      const chatMessages = await getChatMessages(chatId);
      setMessages(chatMessages);
    } catch (error: any) {
      console.error(`Failed to fetch messages for chat ${chatId}:`, error);
      toast.error(error.response?.data?.detail || 'Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId, fetchMessages]);

  const handleSelectChat = (chatId: number) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedChatId || !user) {
      toast.error('No chat selected or user not logged in.');
      return;
    }
    await sendMessage(selectedChatId, content);
    // Messages are now pushed via WebSocket, so no need to refetch all
    // The useWebSocket hook will update the messages state
    // We can optimistically add if needed, but for now rely on WS.
  }, [selectedChatId, user]);

  const handleCreateNewChat = async () => {
    if (!user) {
      toast.error('Please log in to create chats.');
      return;
    }
    const chatName = prompt('Enter name for the new group chat:');
    if (chatName) {
      try {
        const newChat = await createChat({
          name: chatName,
          is_group: true,
          member_ids: [user.id] // Creator is always a member
        });
        setChats(prev => [...prev, newChat]);
        setSelectedChatId(newChat.id);
        toast.success(`Chat "${chatName}" created!`);
      } catch (error: any) {
        console.error('Failed to create chat:', error);
        toast.error(error.response?.data?.detail || 'Failed to create chat.');
      }
    }
  };

  if (authLoading || !isAuthenticated) {
    return <div className="container">Loading authentication...</div>;
  }

  return (
    <div className="container">
      <Header />
      <div className="chat-container">
        <div className="chat-list">
          <h2>Your Chats</h2>
          <button onClick={handleCreateNewChat} style={{ marginBottom: '15px' }}>
            + New Group Chat
          </button>
          {loadingChats ? (
            <p>Loading chats...</p>
          ) : (
            <ChatList chats={chats} onSelectChat={handleSelectChat} selectedChatId={selectedChatId} />
          )}
        </div>
        {selectedChatId && (
          <ChatWindow
            key={selectedChatId} // Key ensures ChatWindow remounts when chat changes
            chatId={selectedChatId}
            initialMessages={messages}
            onSendMessage={handleSendMessage}
          />
        )}
        {!selectedChatId && !loadingChats && (
          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p>Select a chat or create a new one to start talking!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
```