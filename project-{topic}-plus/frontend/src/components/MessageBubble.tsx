```typescript
import React from 'react';
import moment from 'moment';
import { MessageBubbleProps, WebSocketMessageType, SystemMessage, Message } from 'types';

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSender }) => {
  const isSystemMessage = (msg: WebSocketMessageType): msg is SystemMessage => {
    return (msg as SystemMessage).type === 'system';
  };

  if (isSystemMessage(message)) {
    return (
      <div className="message-bubble system my-2 px-3 py-1">
        {message.content}
        <span className="text-xs ml-2 opacity-75">
          {moment(message.sent_at).format('MMM D, HH:mm')}
        </span>
      </div>
    );
  }

  const msg = message as Message; // Cast to Message type after system check
  const bubbleClass = isSender ? 'self bg-primary text-white' : 'other bg-surface text-text';
  const justifyClass = isSender ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex ${justifyClass} mb-3 animate-fade-in`}>
      <div className={`message-bubble ${bubbleClass} flex flex-col`}>
        {!isSender && (
          <span className="font-bold text-sm text-indigo-200 mb-1">{msg.sender.username}</span>
        )}
        <p className="text-sm break-words">{msg.content}</p>
        <span className="text-xs mt-1 text-right opacity-75">
          {moment(msg.sent_at).format('HH:mm')}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
```