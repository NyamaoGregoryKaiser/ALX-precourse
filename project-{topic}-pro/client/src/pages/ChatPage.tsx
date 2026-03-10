import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../hooks/useSocket';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import UserList from '../components/UserList';
import * as api from '../api';
import { Conversation, Message, SocketMessage, SocketUserStatus, User } from '../types';
import './ChatPage.css'; // For basic styling

const ChatPage: React.FC = () => {
  const auth = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [userStatusMap, setUserStatusMap] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const handleSocketMessage = useCallback((newMessage: SocketMessage) => {
    // Only add if it belongs to the currently selected conversation
    if (selectedConversation && newMessage.conversationId === selectedConversation.id) {
      setMessages((prevMessages) => [...prevMessages, {
        ...newMessage,
        sender: {
          id: newMessage.sender.id,
          username: newMessage.sender.username,
          email: '', // Not provided by socket, need to hydrate if full user needed
          createdAt: '',
        }
      }]);
    }

    // Update last message in conversation list
    setConversations((prevConvs) =>
      prevConvs.map((conv) =>
        conv.id === newMessage.conversationId
          ? { ...conv, lastMessage: {
              ...newMessage,
              sender: {
                id: newMessage.sender.id,
                username: newMessage.sender.username,
                email: '',
                createdAt: '',
              }
            }, updatedAt: newMessage.sentAt }
          : conv
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  }, [selectedConversation]);

  const handleUserStatusChange = useCallback((status: SocketUserStatus) => {
    setUserStatusMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(status.userId, status.isOnline);
      return newMap;
    });
  }, []);

  const handleSocketError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const { isConnected: isSocketConnected, sendMessage, joinConversationRoom } = useSocket(auth, {
    onMessageReceive: handleSocketMessage,
    onUserStatusChange: handleUserStatusChange,
    onError: handleSocketError,
  });

  const fetchConversations = useCallback(async () => {
    if (!auth.token || !auth.user) return;
    try {
      const response = await api.getUserConversations(auth.token);
      setConversations(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations.');
    }
  }, [auth.token, auth.user]);

  const fetchUsers = useCallback(async () => {
    if (!auth.token || !auth.user) return;
    try {
      const response = await api.getAllUsers(auth.token);
      // Filter out current user
      setAvailableUsers(response.data.filter(u => u.id !== auth.user?.id));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users.');
    }
  }, [auth.token, auth.user]);

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, [fetchConversations, fetchUsers]);

  useEffect(() => {
    const loadSelectedConversation = async () => {
      if (!conversationId || !auth.token) {
        setSelectedConversation(null);
        setMessages([]);
        return;
      }
      try {
        const convResponse = await api.getConversationById(conversationId, auth.token);
        setSelectedConversation(convResponse.data);
        setMessages(convResponse.data.messages || []);
        joinConversationRoom(conversationId); // Join socket room
      } catch (err: any) {
        setError(err.message || 'Failed to load conversation.');
        setSelectedConversation(null);
        setMessages([]);
        navigate('/chat'); // Redirect if conversation not found
      }
    };
    loadSelectedConversation();
  }, [conversationId, auth.token, navigate, joinConversationRoom]);

  const handleSelectConversation = (conv: Conversation) => {
    navigate(`/chat/${conv.id}`);
  };

  const handleSendMessage = (content: string) => {
    if (selectedConversation) {
      sendMessage(selectedConversation.id, content);
      // Optimistic update (might need rollback on socket error)
      setMessages((prev) => [...prev, {
        id: 'temp-' + Date.now(), // Temp ID
        content,
        senderId: auth.user!.id,
        sender: { ...auth.user! },
        conversationId: selectedConversation.id,
        sentAt: new Date().toISOString(),
      }]);
    } else {
      setError('No conversation selected to send message.');
    }
  };

  const handleStartNewPrivateChat = async (targetUserId: string) => {
    if (!auth.token || !auth.user) return;
    try {
      const response = await api.createPrivateConversation(auth.user.id, targetUserId, auth.token);
      navigate(`/chat/${response.data.id}`);
      fetchConversations(); // Refresh conversation list
    } catch (err: any) {
      setError(err.message || 'Failed to start private chat.');
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <div className="chat-page">
      <div className="sidebar">
        <div className="user-profile">
          <h3>Welcome, {auth.user?.username}!</h3>
          <p>Status: {isSocketConnected ? 'Online' : 'Connecting...'}</p>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id}
          onSelectConversation={handleSelectConversation}
          currentUserId={auth.user?.id || ''}
        />
        <UserList
          users={availableUsers}
          onSelectUser={handleStartNewPrivateChat}
          userStatusMap={userStatusMap}
        />
      </div>
      <div className="main-chat-area">
        {error && <div className="error-message">{error}</div>}
        {selectedConversation ? (
          <>
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              currentUserId={auth.user?.id || ''}
              userStatusMap={userStatusMap}
            />
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="no-conversation-selected">
            <h2>Select a conversation or start a new one to chat.</h2>
            <p>You can also start a private chat with an online user from the "Available Users" list.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;