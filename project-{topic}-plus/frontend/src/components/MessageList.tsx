```typescript
import React, { useRef, useEffect } from 'react';
import { WebSocketMessageType } from 'types';
import MessageBubble from './MessageBubble';
import { useAuth } from 'hooks/useAuth';

interface MessageListProps {
  messages: WebSocketMessageType[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages (if not scrolled up by user)
  useEffect(() => {
    // Only scroll if the user is near the bottom
    const element = messagesEndRef.current?.parentElement;
    if (element) {
      const isScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 100; // 100px tolerance
      if (isScrolledToBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Initial scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  return (
    <div className="flex-grow overflow-y-auto p-4 flex flex-col-reverse">
      {/* Messages are displayed in reverse order, so new messages appear at the bottom */}
      <div ref={messagesEndRef} /> {/* Scroll target */}
      {messages.map((message, index) => {
        // Determine if it's a system message
        const isSystem = (message as any).type === 'system';

        // For regular messages, check if current user is the sender
        const isSender = !isSystem && user && (message as any).sender?.id === user.id;

        return (
          <MessageBubble
            key={isSystem ? `system-${index}-${message.sent_at}` : (message as any).id || index}
            message={message}
            isSender={isSender}
          />
        );
      })}
      {messages.length === 0 && (
        <p className="text-center text-textSecondary mt-auto mb-auto">No messages yet. Start the conversation!</p>
      )}
    </div>
  );
};

export default MessageList;
```