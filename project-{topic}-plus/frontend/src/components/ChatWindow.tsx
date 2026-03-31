```typescript
import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import { toast } from 'react-toastify';
import { useWebSocket } from '../hooks/useWebSocket';

interface ChatWindowProps {
  chatId: number;
  initialMessages: Message[];
  onSendMessage: (content: string) => Promise<void>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, initialMessages, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isWsConnected, messages, setInitialMessages } = useWebSocket(chatId);

  useEffect(() => {
    setInitialMessages(initialMessages);
  }, [initialMessages, setInitialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    try {
      await onSendMessage(content);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast.error(error.response?.data?.detail || "Failed to send message.");
    }
  };

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} disabled={!isWsConnected} />
      {!isWsConnected && <p style={{ color: 'red', textAlign: 'center' }}>Connecting to chat...</p>}
    </div>
  );
};

export default ChatWindow;
```