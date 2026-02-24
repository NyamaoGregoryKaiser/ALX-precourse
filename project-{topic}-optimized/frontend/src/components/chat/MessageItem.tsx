```typescript
import React from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isCurrentUser }) => {
  const messageAlignment = isCurrentUser ? 'flex-end' : 'flex-start';
  const messageBg = isCurrentUser ? 'teal.500' : 'gray.600';
  const messageColor = 'white';
  const borderRadius = isCurrentUser ? 'lg 0px lg lg' : '0px lg lg lg';

  const formatTimestamp = (isoString: string | Date) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Flex justify={messageAlignment}>
      <Box
        bg={messageBg}
        color={messageColor}
        px={4}
        py={2}
        maxWidth="70%"
        borderRadius={borderRadius}
      >
        {!isCurrentUser && (
          <Text fontWeight="bold" fontSize="sm" mb={1} color="teal.100">
            {message.senderUsername}
          </Text>
        )}
        <Text fontSize="md">{message.content}</Text>
        <Text fontSize="xs" mt={1} color="whiteAlpha.700" textAlign={isCurrentUser ? 'right' : 'left'}>
          {formatTimestamp(message.timestamp)}
        </Text>
      </Box>
    </Flex>
  );
};

export default MessageItem;
```