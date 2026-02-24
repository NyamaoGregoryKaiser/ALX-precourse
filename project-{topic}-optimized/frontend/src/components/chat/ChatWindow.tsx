```typescript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, VStack, Text, Flex, Spinner } from '@chakra-ui/react';
import { Channel, Message } from '../../types';
import MessageInput from './MessageInput';
import MessageItem from './MessageItem';
import { useAuth } from '../../auth/AuthProvider';
import * as messageApi from '../../api/message';
import { connectWebSocket, disconnectWebSocket, subscribeToChannel, sendMessage as sendWsMessage } from '../../utils/websocket';

interface ChatWindowProps {
  channel: Channel | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ channel }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { username } = useAuth();
  const stompClientRef = useRef<any>(null); // Ref to store STOMP client instance
  const subscriptionRef = useRef<any>(null); // Ref to store STOMP subscription

  const fetchMessages = useCallback(async (channelId: number) => {
    setLoading(true);
    try {
      const history = await messageApi.getMessagesByChannel(channelId);
      setMessages(history);
    } catch (error) {
      console.error('Failed to fetch message history:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onMessageReceived = useCallback((message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
    console.log('New message received:', message);
  }, []);

  useEffect(() => {
    if (!channel?.id) {
      setMessages([]); // Clear messages when no channel is selected
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      return;
    }

    // Disconnect previous WebSocket and clear messages if channel changes
    if (stompClientRef.current) {
      disconnectWebSocket(stompClientRef.current);
      stompClientRef.current = null;
    }
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    setMessages([]); // Clear messages when channel changes

    fetchMessages(channel.id);

    const token = localStorage.getItem('jwtToken');
    if (!token) {
      console.error('No JWT token found for WebSocket connection.');
      return;
    }

    // Connect WebSocket and subscribe to the new channel
    connectWebSocket(token, (client) => {
      stompClientRef.current = client;
      subscriptionRef.current = subscribeToChannel(client, channel.id, onMessageReceived);
    }, (error) => {
      console.error("WebSocket connection error:", error);
    });

    // Cleanup on component unmount or channel change
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (stompClientRef.current) {
        disconnectWebSocket(stompClientRef.current);
      }
    };
  }, [channel?.id, fetchMessages, onMessageReceived]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    if (!stompClientRef.current || !channel?.id || !username || !content.trim()) {
      console.warn('Cannot send message: WebSocket not connected, no channel selected, or empty content.');
      return;
    }

    const message: Message = {
      channelId: channel.id,
      senderUsername: username,
      content: content.trim(),
      timestamp: new Date().toISOString(), // Use ISO string for consistency, backend will parse
    };
    sendWsMessage(stompClientRef.current, channel.id, message);
  };

  if (!channel) {
    return (
      <Flex flex="1" justify="center" align="center" bg="gray.800">
        <Text fontSize="lg" color="gray.400">Select a channel to start chatting</Text>
      </Flex>
    );
  }

  return (
    <Flex flex="1" flexDirection="column" bg="gray.800">
      <Box p={4} borderBottom="1px" borderColor="gray.700" bg="gray.700">
        <Text fontSize="xl" fontWeight="bold">{channel.name}</Text>
        <Text fontSize="sm" color="gray.400">Creator: {channel.creatorUsername}</Text>
      </Box>

      <VStack flex="1" overflowY="auto" spacing={4} p={4} align="stretch" sx={{
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { bg: 'gray.700' },
          '&::-webkit-scrollbar-thumb': { bg: 'gray.500', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { bg: 'gray.400' },
        }}>
        {loading ? (
          <Center h="100%">
            <Spinner size="xl" color="teal.500" />
          </Center>
        ) : messages.length === 0 ? (
          <Center h="100%">
            <Text color="gray.400">No messages yet. Be the first to say something!</Text>
          </Center>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id || msg.timestamp + msg.senderUsername} // Use ID if available, fallback for unsaved messages
              message={msg}
              isCurrentUser={msg.senderUsername === username}
            />
          ))
        )}
        <div ref={messagesEndRef} /> {/* Scroll target */}
      </VStack>

      <Box p={4} borderTop="1px" borderColor="gray.700">
        <MessageInput onSendMessage={handleSendMessage} />
      </Box>
    </Flex>
  );
};

export default ChatWindow;
```