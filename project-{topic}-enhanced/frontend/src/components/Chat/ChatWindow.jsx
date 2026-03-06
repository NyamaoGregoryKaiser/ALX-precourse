```javascript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import MessageInput from './MessageInput';
import Message from './Message';
import messagesApi from '../../api/messages';

const MESSAGE_FETCH_LIMIT = 30; // Number of messages to fetch per scroll

function ChatWindow() {
  const { user } = useAuth();
  const { currentChannel, messages, setMessages, typingUsers, getSocket } = useChat();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Scroll to bottom on new messages (only if not actively scrolling up)
  useEffect(() => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Only scroll to bottom if already at or near bottom
      if (scrollHeight - scrollTop <= clientHeight + 100 || messages.length <= MESSAGE_FETCH_LIMIT) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Fetch initial messages when channel changes
  useEffect(() => {
    if (currentChannel) {
      setMessages([]); // Clear messages when channel changes
      setHasMoreMessages(true);
      fetchMessages(currentChannel.id, null); // Fetch initial messages
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannel]);

  const fetchMessages = useCallback(async (channelId, cursor) => {
    if (!channelId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const response = await messagesApi.getChannelMessages(channelId, MESSAGE_FETCH_LIMIT, cursor);
      const fetched = response.data;

      if (fetched.length < MESSAGE_FETCH_LIMIT) {
        setHasMoreMessages(false);
      }

      setMessages((prevMessages) => {
        // Filter out duplicates if new messages arrive during pagination
        const newMessages = fetched.filter(
          (fm) => !prevMessages.some((pm) => pm.id === fm.id)
        );
        return [...newMessages, ...prevMessages];
      });

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreMessages, setMessages]);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop } = scrollContainerRef.current;
      if (scrollTop === 0 && !isLoadingMore && hasMoreMessages && messages.length > 0) {
        const oldestMessageId = messages[0].id;
        fetchMessages(currentChannel.id, oldestMessageId);
      }
    }
  }, [messages, currentChannel, isLoadingMore, hasMoreMessages, fetchMessages]);

  useEffect(() => {
    const scrollDiv = scrollContainerRef.current;
    if (scrollDiv) {
      scrollDiv.addEventListener('scroll', handleScroll);
      return () => {
        scrollDiv.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  const handleSendMessage = (content) => {
    if (!currentChannel || !content.trim()) return;
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('sendMessage', { channelId: currentChannel.id, content }, (response) => {
        if (response.status === 'error') {
          console.error('Socket message send error:', response.message);
        }
      });
    } else {
      console.error('Socket not connected, cannot send message.');
    }
  };

  const handleTypingStart = () => {
    if (!currentChannel) return;
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typingStart', currentChannel.id);
    }
  };

  const handleTypingStop = () => {
    if (!currentChannel) return;
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typingStop', currentChannel.id);
    }
  };

  if (!currentChannel) {
    return (
      <div className="chat-window-container">
        <p style={{ textAlign: 'center', marginTop: '2rem' }}>Select a channel to start chatting.</p>
      </div>
    );
  }

  const currentTypingUsers = Array.from(typingUsers.get(currentChannel.id) || []);
  const otherTypingUsers = currentTypingUsers.filter(tu => tu.id !== user.id);

  return (
    <div className="chat-window-container">
      <h3>#{currentChannel.name}</h3>
      <div className="messages-container" ref={scrollContainerRef}>
        {isLoadingMore && <p style={{textAlign: 'center', color: '#888'}}>Loading more messages...</p>}
        {!hasMoreMessages && messages.length > 0 && <p style={{textAlign: 'center', color: '#888'}}>No older messages.</p>}
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} isMyMessage={msg.userId === user.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="typing-indicator">
        {otherTypingUsers.length > 0 && (
          `${otherTypingUsers.map(u => u.username).join(', ')} ${otherTypingUsers.length === 1 ? 'is' : 'are'} typing...`
        )}
      </div>
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />
    </div>
  );
}

export default ChatWindow;
```