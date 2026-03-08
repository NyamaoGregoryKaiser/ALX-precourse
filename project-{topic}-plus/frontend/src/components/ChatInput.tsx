```typescript
import React, { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-surface border-t border-border flex items-center">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="input-field flex-grow mr-3"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="btn-primary p-3 rounded-md flex items-center justify-center"
        disabled={!message.trim() || isLoading}
      >
        <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
      </button>
    </form>
  );
};

export default ChatInput;
```