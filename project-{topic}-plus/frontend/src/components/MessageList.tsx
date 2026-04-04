```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Message, User } from '../types';
import * as messageService from '../services/message';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import './MessageList.css';
import moment from 'moment';

interface MessageListProps {
  conversationId: string;
  participants: User[]; // Pass participants to display typing indicators
}

const MessageList: React.FC<MessageListProps> = ({ conversationId, participants }) => {
  const { user: currentUser } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({}); // userId: username
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    setLoading(true);
    setError(null);
    setMessages([]); // Clear messages when conversation changes
    setTypingUsers({});

    const fetchMessages = async () => {
      try {
        const fetchedMessages = await messageService.getMessages(conversationId);
        setMessages(fetchedMessages);
        // Ensure to join the conversation room on the socket connection
        socket?.emit('join_conversation', { conversationId });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Socket listeners
    const handleReceiveMessage = (newMessage: Message) => {
      if (newMessage.conversationId === conversationId) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    };

    const handleTypingStarted = (data: { conversationId: string; userId: string; username: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUser.id) {
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.username }));
      }
    };

    const handleTypingStopped = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[data.userId];
          return newTypingUsers;
        });
      }
    };

    socket?.on('receive_message', handleReceiveMessage);
    socket?.on('typing_started', handleTypingStarted);
    socket?.on('typing_stopped', handleTypingStopped);

    return () => {
      socket?.off('receive_message', handleReceiveMessage);
      socket?.off('typing_started', handleTypingStarted);
      socket?.off('typing_stopped', handleTypingStopped);
      socket?.emit('leave_conversation', { conversationId }); // Leave room on unmount
    };
  }, [conversationId, currentUser, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]); // Scroll when messages or typing users change

  if (loading) return <div className="message-list-loading">Loading messages...</div>;
  if (error) return <div className="message-list-error">Error: {error}</div>;

  return (
    <div className="message-list-container">
      <div className="message-list">
        {messages.length === 0 ? (
          <p className="no-messages-message">No messages in this conversation yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.senderId === currentUser?.id ? 'sent' : 'received'}`}
            >
              <div className="message-sender">{msg.sender.username}</div>
              <div className="message-content">{msg.content}</div>
              <div className="message-timestamp">{moment(msg.createdAt).format('MMM D, HH:mm')}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} /> {/* Scroll target */}
      </div>
      {Object.keys(typingUsers).length > 0 && (
        <div className="typing-indicator">
          {Object.values(typingUsers).join(', ')} is typing...
        </div>
      )}
    </div>
  );
};

export default MessageList;
```