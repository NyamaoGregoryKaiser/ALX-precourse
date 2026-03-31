```typescript
import { useEffect, useState, useRef, useCallback } from 'react';
import { webSocketService } from '../api/websocket';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Message } from '../types';

export const useWebSocket = (chatId: number | null) => {
  const { token, isAuthenticated } = useAuth();
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]); // To accumulate new messages

  // Ref to store messages to prevent stale closure issues with setMessages
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleNewMessage = useCallback((event: MessageEvent) => {
    try {
      const receivedData = JSON.parse(event.data);
      if (receivedData.type === 'chat_joined' || receivedData.type === 'chat_left') {
        console.log(`WS event: ${receivedData.type} for chat ${receivedData.chat_id}`);
        return;
      }
      // Assuming receivedData is a Message object
      const newMessage: Message = receivedData;
      setMessages(prevMessages => [...prevMessages, newMessage]);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

  const handleWsOpen = useCallback(() => {
    setIsWsConnected(true);
    toast.success(`Connected to chat ${chatId} via WebSocket!`);
  }, [chatId]);

  const handleWsClose = useCallback((event: CloseEvent) => {
    setIsWsConnected(false);
    if (!event.wasClean) {
      toast.warn(`WebSocket connection unexpectedly closed for chat ${chatId}. Reconnecting...`);
    } else {
      console.log(`WebSocket connection closed cleanly for chat ${chatId}.`);
    }
  }, [chatId]);

  useEffect(() => {
    if (chatId && token && isAuthenticated) {
      webSocketService.connect(chatId, token);
      webSocketService.addMessageListener(handleNewMessage);
      webSocketService.addOpenListener(handleWsOpen);
      webSocketService.addCloseListener(handleWsClose);
      
      // Initial check for connection status
      if (webSocketService.getReadyState() === WebSocket.OPEN) {
        setIsWsConnected(true);
      } else {
        setIsWsConnected(false);
      }

    } else {
      webSocketService.disconnect();
      setIsWsConnected(false);
    }

    return () => {
      webSocketService.removeMessageListener(handleNewMessage);
      webSocketService.removeOpenListener(handleWsOpen);
      webSocketService.removeCloseListener(handleWsClose);
      // Only disconnect if this specific chatId is no longer active
      // or if component unmounts and no other chat is active.
      // The service itself handles switching chats.
    };
  }, [chatId, token, isAuthenticated, handleNewMessage, handleWsOpen, handleWsClose]);

  const setInitialMessages = useCallback((initialMsgs: Message[]) => {
    setMessages(initialMsgs);
  }, []);

  return { isWsConnected, messages, setInitialMessages };
};
```