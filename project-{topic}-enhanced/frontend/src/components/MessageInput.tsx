```tsx
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const InputContainer = styled.form`
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
  background-color: #fff;
`;

const StyledInput = styled.input`
  flex-grow: 1;
  padding: 10px 15px;
  border: 1px solid #ccc;
  border-radius: 20px;
  margin-right: 10px;
  font-size: 16px;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const SendButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  &:hover {
    background-color: #0056b3;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    // Debounce typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500); // Stop typing after 1.5s of no input
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false); // Ensure stop typing is sent after message
    }
  };

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <InputContainer onSubmit={handleSubmit}>
      <StyledInput
        type="text"
        value={message}
        onChange={handleInputChange}
        placeholder="Type a message..."
        autoFocus
      />
      <SendButton type="submit" disabled={!message.trim()}>
        Send
      </SendButton>
    </InputContainer>
  );
};

export default MessageInput;
```