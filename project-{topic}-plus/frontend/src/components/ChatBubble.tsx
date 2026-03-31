```typescript
import React from 'react';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const isMine = user?.id === message.owner.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
      <div className="message-content">
        {!isMine && (
          <div className="message-sender" style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            {message.owner.username}
          </div>
        )}
        <div>{message.content}</div>
        <div className="message-info">{formatDate(message.created_at)}</div>
      </div>
    </div>
  );
};

export default ChatBubble;
```