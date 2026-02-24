```typescript
import React, { useState } from 'react';
import { Input, Button, Flex } from '@chakra-ui/react';
import { SendIcon } from '@chakra-ui/icons'; // Assuming you have a SendIcon or can use another

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <Flex as="form" onSubmit={handleSubmit}>
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        mr={2}
        bg="gray.600"
        _placeholder={{ color: 'gray.400' }}
        size="lg"
      />
      <Button type="submit" colorScheme="teal" size="lg" px={6}>
        Send
      </Button>
    </Flex>
  );
};

export default MessageInput;
```