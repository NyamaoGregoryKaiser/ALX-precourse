```typescript
import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import './MessageInput.css';

interface MessageInputProps {
  conversationId: string;
  onSendMessage: () => void; // Callback to re-fetch messages or update UI
}

const MessageInput: React.FC<MessageInputProps> = ({ conversationId, onSendMessage }) => {
  const [message, setMessage] = useState<string>('');
  const { user } = useAuth();
  const socket = useSocket();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const TYPING_TIMEOUT = 3000; // 3 seconds

  useEffect(() => {
    let typingTimer: NodeJS.Timeout;

    const handleTypingStart = () => {
      if (!isTyping) {
        setIsTyping(true);
        socket?.emit('typing_start', { conversationId });
      }
      clearTimeout(typingTimer);
      typingTimer = setTimeout(handleTypingStop, TYPING_TIMEOUT);
    };

    const handleTypingStop = () => {
      if (isTyping) {
        setIsTyping(false);
        socket?.emit('typing_stop', { conversationId });
      }
    };

    if (message.length > 0) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }

    return () => {
      clearTimeout(typingTimer);
      handleTypingStop(); // Ensure typing_stop is sent on unmount/cleanup
    };
  }, [message, conversationId, socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user && socket) {
      socket.emit('send_message', { conversationId, content: message.trim() });
      setMessage('');
      onSendMessage(); // Trigger UI update (e.g., scroll to bottom)
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input-form">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={!user || !conversationId}
      />
      <button type="submit" disabled={!message.trim() || !user || !conversationId}>
        Send
      </button>
    </form>
  );
};

export default MessageInput;
```