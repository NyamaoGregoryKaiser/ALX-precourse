```typescript
import React, { useState, useEffect } from 'react';
import { Conversation, User } from '../types';
import * as conversationService from '../services/conversation';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import './ConversationList.css';
import UserSearch from './UserSearch';
import * as userService from '../services/user';
import moment from 'moment';

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation, selectedConversationId }) => {
  const { user: currentUser } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        const fetchedConversations = await conversationService.getConversations();
        setConversations(fetchedConversations);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch conversations.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Socket listeners for real-time updates
    const handleReceiveMessage = (message: any) => {
      // Find the conversation and update its last message and order
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                senderId: message.senderId,
                content: message.content,
                createdAt: message.createdAt,
              },
              updatedAt: new Date().toISOString(), // Mark as most recently active
            };
          }
          return conv;
        });
        // Sort to bring the conversation with the new message to top
        return updatedConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    const handleUserOnline = (data: { userId: string, username: string }) => {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        participants: conv.participants.map(p =>
          p.id === data.userId ? { ...p, status: 'ONLINE' } : p
        )
      })));
    };

    const handleUserOffline = (data: { userId: string }) => {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        participants: conv.participants.map(p =>
          p.id === data.userId ? { ...p, status: 'OFFLINE' } : p
        )
      })));
    };

    socket?.on('receive_message', handleReceiveMessage);
    socket?.on('user_online', handleUserOnline);
    socket?.on('user_offline', handleUserOffline);

    return () => {
      socket?.off('receive_message', handleReceiveMessage);
      socket?.off('user_online', handleUserOnline);
      socket?.off('user_offline', handleUserOffline);
    };
  }, [currentUser, socket]);

  const handleCreateDM = async (targetUser: User) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      // Check if a DM already exists
      const existingDM = conversations.find(conv =>
        !conv.isGroup &&
        conv.participants.some(p => p.id === targetUser.id) &&
        conv.participants.some(p => p.id === currentUser.id)
      );

      if (existingDM) {
        onSelectConversation(existingDM.id);
        setShowUserSearch(false);
        setLoading(false);
        return;
      }

      const newConversation = await conversationService.createConversation([targetUser.id]);
      setConversations(prev => [newConversation, ...prev]);
      onSelectConversation(newConversation.id);
      setShowUserSearch(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="conversation-list-loading">Loading conversations...</div>;
  if (error) return <div className="conversation-list-error">Error: {error}</div>;

  const getConversationName = (conv: Conversation) => {
    if (conv.isGroup) {
      return conv.name;
    }
    const otherParticipant = conv.participants.find(p => p.id !== currentUser?.id);
    return otherParticipant ? otherParticipant.username : 'Unknown User';
  };

  const getLastMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return "No messages yet.";
    const sender = conv.participants.find(p => p.id === conv.lastMessage?.senderId);
    const senderName = sender ? (sender.id === currentUser?.id ? 'You' : sender.username) : 'Unknown';
    return `${senderName}: ${conv.lastMessage.content.substring(0, 30)}${conv.lastMessage.content.length > 30 ? '...' : ''}`;
  };

  const getOnlineStatus = (conv: Conversation) => {
    if (conv.isGroup) {
      const onlineCount = conv.participants.filter(p => p.status === 'ONLINE').length;
      return `${onlineCount} online`;
    } else {
      const otherParticipant = conv.participants.find(p => p.id !== currentUser?.id);
      return otherParticipant?.status === 'ONLINE' ? 'Online' : 'Offline';
    }
  };

  return (
    <div className="conversation-list-container">
      <div className="conversation-list-header">
        <h3>Conversations</h3>
        <button className="new-chat-button" onClick={() => setShowUserSearch(!showUserSearch)}>
          {showUserSearch ? 'Cancel' : '+ New Chat'}
        </button>
      </div>

      {showUserSearch && (
        <UserSearch onSelectUser={handleCreateDM} currentUser={currentUser || null} />
      )}

      <ul className="conversation-list">
        {conversations.length === 0 && !showUserSearch ? (
          <p className="no-conversations-message">No conversations yet. Start a new chat!</p>
        ) : (
          conversations.map(conv => (
            <li
              key={conv.id}
              className={`conversation-item ${conv.id === selectedConversationId ? 'selected' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-info">
                <span className="conversation-name">{getConversationName(conv)}</span>
                <span className={`conversation-status ${getOnlineStatus(conv).toLowerCase().includes('online') ? 'online' : 'offline'}`}>
                  {getOnlineStatus(conv)}
                </span>
                <p className="last-message-preview">{getLastMessagePreview(conv)}</p>
                {conv.lastMessage && (
                  <span className="message-timestamp">
                    {moment(conv.lastMessage.createdAt).fromNow()}
                  </span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ConversationList;
```