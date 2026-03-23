```tsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { getSocket } from 'api/socket';
import { ChatRoom as ChatRoomType, Message as MessageType, User } from 'types';
import { Socket } from 'socket.io-client';
import MessageInput from './MessageInput';
import axiosInstance from 'api/axiosInstance';
import { AuthContext } from 'contexts/AuthContext';
import { useContext } from 'react';

const ChatRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px); /* Adjust for header if any */
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f9f9f9;
`;

const ChatHeader = styled.div`
  padding: 15px;
  background-color: #007bff;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  border-bottom: 1px solid #0056b3;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MessagesContainer = styled.div`
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MessageBubble = styled.div<{ isSender: boolean }>`
  background-color: ${(props) => (props.isSender ? '#dcf8c6' : '#fff')};
  align-self: ${(props) => (props.isSender ? 'flex-end' : 'flex-start')};
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 70%;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
  word-wrap: break-word;
`;

const MessageInfo = styled.div`
  font-size: 0.75rem;
  color: #666;
  margin-top: 5px;
  text-align: right;
`;

const MessageSender = styled.span`
  font-weight: bold;
  margin-right: 5px;
`;

const TypingIndicator = styled.div`
  padding: 5px 15px;
  font-style: italic;
  color: #888;
  font-size: 0.9em;
`;

interface ChatRoomProps {
  chatRoom: ChatRoomType;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chatRoom }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initial fetch of message history
    const fetchMessages = async () => {
      try {
        const response = await axiosInstance.get(`/chats/${chatRoom.id}/messages`);
        setMessages(response.data.data.messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchMessages();

    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('joinRoom', chatRoom.id, (status: string, message?: string) => {
      if (status === 'error') {
        console.error(`Failed to join room ${chatRoom.name}: ${message}`);
        // Handle error, e.g., show a toast notification
      } else {
        console.log(`Successfully joined room ${chatRoom.name}`);
      }
    });

    socket.on('message', (message: MessageType) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      setTypingUsers((prev) => {
        const newTyping = new Set(prev);
        newTyping.delete(message.senderId);
        return newTyping;
      });
    });

    socket.on('userJoined', ({ userId, username, chatRoomId }) => {
      if (chatRoomId === chatRoom.id && userId !== currentUser?.id) {
        console.log(`${username} joined the room`);
        // Optionally add a system message
        setMessages((prev) => [...prev, {
          id: `sys-${Date.now()}`,
          chatRoomId,
          senderId: 'system',
          senderUsername: 'System',
          content: `${username} has joined the chat.`,
          createdAt: new Date().toISOString()
        }]);
      }
    });

    socket.on('userLeft', ({ userId, username, chatRoomId }) => {
      if (chatRoomId === chatRoom.id && userId !== currentUser?.id) {
        console.log(`${username} left the room`);
        // Optionally add a system message
        setMessages((prev) => [...prev, {
          id: `sys-${Date.now()}`,
          chatRoomId,
          senderId: 'system',
          senderUsername: 'System',
          content: `${username} has left the chat.`,
          createdAt: new Date().toISOString()
        }]);
      }
    });

    socket.on('typing', ({ userId, username, chatRoomId }) => {
      if (chatRoomId === chatRoom.id && userId !== currentUser?.id) {
        setTypingUsers((prev) => new Set(prev).add(username));
      }
    });

    socket.on('stopTyping', ({ userId, username, chatRoomId }) => {
      if (chatRoomId === chatRoom.id && userId !== currentUser?.id) {
        setTypingUsers((prev) => {
          const newTyping = new Set(prev);
          newTyping.delete(username);
          return newTyping;
        });
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveRoom', chatRoom.id);
        socketRef.current.off('message');
        socketRef.current.off('userJoined');
        socketRef.current.off('userLeft');
        socketRef.current.off('typing');
        socketRef.current.off('stopTyping');
      }
    };
  }, [chatRoom.id, chatRoom.name, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSendMessage = async (content: string) => {
    if (!currentUser || !socketRef.current) return;

    const messagePayload = {
      chatRoomId: chatRoom.id,
      senderId: currentUser.id,
      content,
    };

    try {
      // Send message via WebSocket for real-time broadcast
      socketRef.current.emit('chatMessage', messagePayload, (status: string, response: any) => {
        if (status === 'error') {
          console.error('WebSocket message error:', response);
          // Handle error (e.g., show to user)
        } else {
          console.log('Message sent via WebSocket');
        }
      });

      // Optionally, you can also hit a REST API endpoint to ensure persistence directly
      // await axiosInstance.post(`/chats/${chatRoom.id}/messages`, { content });

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!socketRef.current) return;
    if (isTyping) {
      socketRef.current.emit('typing', chatRoom.id);
    } else {
      socketRef.current.emit('stopTyping', chatRoom.id);
    }
  };

  return (
    <ChatRoomContainer>
      <ChatHeader>
        {chatRoom.name}
        <span>Participants: {chatRoom.participants.length}</span>
      </ChatHeader>
      <MessagesContainer>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} isSender={msg.senderId === currentUser?.id}>
            {! (msg.senderId === currentUser?.id || msg.senderId === 'system') && (
              <MessageSender>{msg.senderUsername}:</MessageSender>
            )}
            {msg.content}
            <MessageInfo>{new Date(msg.createdAt).toLocaleTimeString()}</MessageInfo>
          </MessageBubble>
        ))}
        {typingUsers.size > 0 && (
          <TypingIndicator>{Array.from(typingUsers).join(', ')} is typing...</TypingIndicator>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
    </ChatRoomContainer>
  );
};

export default ChatRoom;
```