```javascript
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../api/socket';
import channelsApi from '../api/channels';
import { useAuth } from '../hooks/useAuth';

export const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { isAuthenticated, user, loading: authLoading, logout } = useAuth();
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  // activeUsers: Map<channelId, Set<UserObject>>
  const [activeUsers, setActiveUsers] = useState(new Map());
  // typingUsers: Map<channelId, Set<UserObject>>
  const [typingUsers, setTypingUsers] = useState(new Map());

  const socketRef = useRef(null);
  const typingTimersRef = useRef(new Map()); // Map<userId@channelId, timeoutId>

  // --- WebSocket Setup ---
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const tokens = JSON.parse(localStorage.getItem('tokens'));
      if (tokens && tokens.accessToken?.token) {
        socketRef.current = connectSocket(tokens.accessToken.token);
        setupSocketListeners(socketRef.current);
      }
    } else if (!isAuthenticated) {
      // Disconnect socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      // Clear all chat-related states
      setChannels([]);
      setCurrentChannel(null);
      setMessages([]);
      setActiveUsers(new Map());
      setTypingUsers(new Map());
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.offAny(); // Remove all listeners
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, authLoading, user, logout]);


  const setupSocketListeners = useCallback((socket) => {
    if (!socket) return;

    // Clear previous listeners to prevent duplicates
    socket.offAny();

    socket.on('connect', () => {
      console.log('Chat Socket.IO connected.');
      // When socket reconnects, rejoin current channel if any
      if (currentChannel) {
        socket.emit('joinChannel', currentChannel.id, (response) => {
            if (response.status === 'success') {
                console.log(`Rejoined channel ${currentChannel.id}`);
                // Update active users for the channel immediately on reconnect
                setActiveUsers(prev => new Map(prev).set(currentChannel.id, new Set(response.activeUsers)));
            } else {
                console.error(`Failed to rejoin channel ${currentChannel.id}:`, response.message);
                // Handle re-join failure, e.g., prompt user to re-select channel
                setCurrentChannel(null);
                setMessages([]);
            }
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Chat Socket.IO disconnected:', reason);
      // Clear active users and typing indicators on disconnect
      setActiveUsers(new Map());
      setTypingUsers(new Map());
    });

    socket.on('newMessage', (message) => {
      console.log('Received new message:', message);
      // Only add message if it belongs to the current active channel
      if (currentChannel && message.channelId === currentChannel.id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    socket.on('userJoinedChannel', ({ userId, username, channelId }) => {
      console.log(`${username} joined channel ${channelId}`);
      setActiveUsers(prev => {
        const newMap = new Map(prev);
        const usersInChannel = newMap.get(channelId) || new Set();
        usersInChannel.add({ id: userId, username });
        return newMap.set(channelId, usersInChannel);
      });
    });

    socket.on('userLeftChannel', ({ userId, username, channelId }) => {
      console.log(`${username} left channel ${channelId}`);
      setActiveUsers(prev => {
        const newMap = new Map(prev);
        const usersInChannel = newMap.get(channelId) || new Set();
        usersInChannel.forEach(u => {
            if (u.id === userId) usersInChannel.delete(u);
        });
        return newMap.set(channelId, usersInChannel);
      });
      // Also remove from typing indicators
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const typingUsersInChannel = newMap.get(channelId) || new Set();
        typingUsersInChannel.forEach(u => {
            if (u.id === userId) typingUsersInChannel.delete(u);
        });
        return newMap.set(channelId, typingUsersInChannel);
      });
    });

    socket.on('typingStart', ({ userId, username, channelId }) => {
      if (userId === user?.id) return; // Don't show typing for self
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const usersTypingInChannel = newMap.get(channelId) || new Set();
        usersTypingInChannel.add({ id: userId, username });
        return newMap.set(channelId, usersTypingInChannel);
      });

      // Clear previous timer for this user if they type again
      if (typingTimersRef.current.has(`${userId}@${channelId}`)) {
        clearTimeout(typingTimersRef.current.get(`${userId}@${channelId}`));
      }

      // Set a timeout to remove typing indicator after a period
      const timer = setTimeout(() => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          const usersTypingInChannel = newMap.get(channelId) || new Set();
          usersTypingInChannel.forEach(u => {
            if (u.id === userId) usersTypingInChannel.delete(u);
          });
          return newMap.set(channelId, usersTypingInChannel);
        });
        typingTimersRef.current.delete(`${userId}@${channelId}`);
      }, 5000); // Remove after 5 seconds if no new typing event

      typingTimersRef.current.set(`${userId}@${channelId}`, timer);
    });

    socket.on('typingStop', ({ userId, channelId }) => {
      if (userId === user?.id) return;
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const usersTypingInChannel = newMap.get(channelId) || new Set();
        usersTypingInChannel.forEach(u => {
            if (u.id === userId) usersTypingInChannel.delete(u);
        });
        return newMap.set(channelId, usersTypingInChannel);
      });
      if (typingTimersRef.current.has(`${userId}@${channelId}`)) {
        clearTimeout(typingTimersRef.current.get(`${userId}@${channelId}`));
        typingTimersRef.current.delete(`${userId}@${channelId}`);
      }
    });

    socket.on('channelMessageHistory', ({ channelId, messages: historyMessages }) => {
        if (currentChannel && channelId === currentChannel.id) {
            setMessages(historyMessages);
        }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      if (err.message.includes('token') || err.message.includes('authenticate')) {
          console.error('Authentication error on socket, forcing logout.');
          logout();
      }
    });

  }, [currentChannel, user, logout]);


  // --- API Functions ---
  const fetchChannels = useCallback(async () => {
    try {
      const response = await channelsApi.getAllChannels();
      setChannels(response.data);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }, []);

  const joinChannel = useCallback(async (channelId) => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
        console.error('Socket not connected, cannot join channel.');
        return;
    }
    // Attempt to join via API first to ensure user membership is recorded
    try {
        await channelsApi.joinChannel(channelId);
        // Then emit socket event
        socket.emit('joinChannel', channelId, (response) => {
            if (response.status === 'success') {
                console.log(`Successfully joined channel ${channelId} via socket.`);
                // Set initial active users from callback
                setActiveUsers(prev => new Map(prev).set(channelId, new Set(response.activeUsers)));
            } else {
                console.error(`Socket failed to join channel ${channelId}:`, response.message);
                // Handle cases where socket join fails but API succeeded (e.g., membership existed)
                // In such case, fetch active users via REST if needed, or rely on future broadcasts
                channelsApi.getChannelMembers(channelId)
                    .then(res => setActiveUsers(prev => new Map(prev).set(channelId, new Set(res.data))))
                    .catch(err => console.error('Failed to get channel members after socket join error', err));
            }
        });
    } catch (error) {
        console.error('API failed to join channel:', error.response?.data?.message || error.message);
        throw error;
    }
  }, []);

  const leaveChannel = useCallback(async (channelId) => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
        console.error('Socket not connected, cannot leave channel.');
        return;
    }
    try {
      await channelsApi.leaveChannel(channelId);
      socket.emit('leaveChannel', channelId, (response) => {
          if (response.status === 'success') {
              console.log(`Successfully left channel ${channelId} via socket.`);
          } else {
              console.error(`Socket failed to leave channel ${channelId}:`, response.message);
          }
      });
    } catch (error) {
      console.error('API failed to leave channel:', error.response?.data?.message || error.message);
      throw error;
    } finally {
        // Optimistically clear active users and typing from state
        setActiveUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(channelId);
            return newMap;
        });
        setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(channelId);
            return newMap;
        });
    }
  }, []);

  const chatValue = {
    channels,
    fetchChannels,
    currentChannel,
    setCurrentChannel,
    messages,
    setMessages, // Allows ChatWindow to update messages (e.g., for pagination)
    activeUsers,
    typingUsers,
    joinChannel,
    leaveChannel,
    getSocket: () => socketRef.current, // Provide access to socket instance
    disconnectSocket: () => disconnectSocket(), // Expose utility to disconnect
  };

  return (
    <ChatContext.Provider value={chatValue}>
      {children}
    </ChatContext.Provider>
  );
};
```