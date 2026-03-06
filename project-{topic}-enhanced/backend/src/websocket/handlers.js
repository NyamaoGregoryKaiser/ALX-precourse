```javascript
import logger from '../config/logger.js';
import channelService from '../services/channelService.js';
import messageService from '../services/messageService.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import cache from '../utils/cache.js';

// Store active users per channel using Redis Set
const ACTIVE_USERS_PREFIX = 'activeUsers:';
const TYPING_USERS_PREFIX = 'typingUsers:';

/**
 * Handles all WebSocket events for the chat application.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @param {import('socket.io').Socket} socket - The client socket instance.
 * @param {object} user - The authenticated user object from the token.
 */
const registerSocketHandlers = (io, socket, user) => {
  logger.info(`User ${user.username} (ID: ${user.id}) connected via WebSocket.`);

  // --- Initial Setup ---
  // When a user connects, we need to add them to a "global" online users list
  // and manage their presence in channels.
  // We'll manage active users in specific channels when they join/leave.

  // --- Event: joinChannel ---
  socket.on('joinChannel', async (channelId, callback) => {
    logger.debug(`User ${user.username} attempting to join channel: ${channelId}`);
    try {
      const isMember = await channelService.checkUserMembership(channelId, user.id);
      if (!isMember) {
        throw new ApiError(httpStatus.FORBIDDEN, `User ${user.username} is not a member of channel ${channelId}`);
      }

      // Join the Socket.IO room for this channel
      socket.join(channelId);

      // Add user to active users set for this channel in Redis
      await cache.getClient().sAdd(`${ACTIVE_USERS_PREFIX}${channelId}`, JSON.stringify({ id: user.id, username: user.username }));

      // Broadcast to everyone in the channel that a user has joined
      io.to(channelId).emit('userJoinedChannel', { userId: user.id, username: user.username, channelId });
      logger.info(`User ${user.username} joined channel ${channelId}`);

      // Get current active users for the channel
      const activeUsersRaw = await cache.getClient().sMembers(`${ACTIVE_USERS_PREFIX}${channelId}`);
      const activeUsers = activeUsersRaw.map(JSON.parse);

      // Acknowledge the join and provide active users list to the joining user
      if (callback && typeof callback === 'function') {
        callback({ status: 'success', message: `Joined channel ${channelId}`, activeUsers });
      }

      // Fetch and send message history to the newly joined user
      const messages = await messageService.getChannelMessages(channelId);
      socket.emit('channelMessageHistory', { channelId, messages });

    } catch (error) {
      logger.error(`Error joining channel ${channelId} for user ${user.username}:`, error.message);
      if (callback && typeof callback === 'function') {
        const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
        callback({ status: 'error', message: error.message, code: statusCode });
      }
    }
  });

  // --- Event: leaveChannel ---
  socket.on('leaveChannel', async (channelId, callback) => {
    logger.debug(`User ${user.username} attempting to leave channel: ${channelId}`);
    try {
      socket.leave(channelId);

      // Remove user from active users set for this channel in Redis
      await cache.getClient().sRem(`${ACTIVE_USERS_PREFIX}${channelId}`, JSON.stringify({ id: user.id, username: user.username }));

      // Broadcast to everyone in the channel that a user has left
      io.to(channelId).emit('userLeftChannel', { userId: user.id, username: user.username, channelId });
      logger.info(`User ${user.username} left channel ${channelId}`);

      if (callback && typeof callback === 'function') {
        callback({ status: 'success', message: `Left channel ${channelId}` });
      }
    } catch (error) {
      logger.error(`Error leaving channel ${channelId} for user ${user.username}:`, error.message);
      if (callback && typeof callback === 'function') {
        callback({ status: 'error', message: error.message, code: httpStatus.INTERNAL_SERVER_ERROR });
      }
    }
  });

  // --- Event: sendMessage ---
  socket.on('sendMessage', async ({ channelId, content }, callback) => {
    logger.debug(`User ${user.username} sending message to channel ${channelId}`);
    try {
      const message = await messageService.sendMessage(user.id, channelId, content);

      // Broadcast the new message to all clients in the channel
      io.to(channelId).emit('newMessage', message);
      logger.info(`Message sent to channel ${channelId} by ${user.username}: ${content}`);

      if (callback && typeof callback === 'function') {
        callback({ status: 'success', message: 'Message sent', data: message });
      }
    } catch (error) {
      logger.error(`Error sending message for user ${user.username} in channel ${channelId}:`, error.message);
      if (callback && typeof callback === 'function') {
        const statusCode = error instanceof ApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
        callback({ status: 'error', message: error.message, code: statusCode });
      }
    }
  });

  // --- Event: typingStart ---
  socket.on('typingStart', async (channelId) => {
    // Add user to typing set for this channel in Redis with an expiry
    const typingKey = `${TYPING_USERS_PREFIX}${channelId}`;
    const userTypingData = JSON.stringify({ id: user.id, username: user.username });
    await cache.getClient().zAdd(typingKey, { score: Date.now(), value: userTypingData });
    await cache.getClient().expire(typingKey, 5); // Typing indicator active for 5 seconds

    // Broadcast to other clients in the channel (excluding the sender)
    socket.to(channelId).emit('typingStart', { userId: user.id, username: user.username, channelId });
    logger.debug(`User ${user.username} started typing in channel ${channelId}`);
  });

  // --- Event: typingStop ---
  socket.on('typingStop', async (channelId) => {
    // Remove user from typing set for this channel in Redis
    const typingKey = `${TYPING_USERS_PREFIX}${channelId}`;
    const userTypingData = JSON.stringify({ id: user.id, username: user.username });
    await cache.getClient().zRem(typingKey, userTypingData);

    // Broadcast to other clients in the channel (excluding the sender)
    socket.to(channelId).emit('typingStop', { userId: user.id, username: user.username, channelId });
    logger.debug(`User ${user.username} stopped typing in channel ${channelId}`);
  });

  // --- Event: requestChannelUsers ---
  socket.on('requestChannelUsers', async (channelId, callback) => {
    logger.debug(`User ${user.username} requesting active users for channel ${channelId}`);
    try {
      const activeUsersRaw = await cache.getClient().sMembers(`${ACTIVE_USERS_PREFIX}${channelId}`);
      const activeUsers = activeUsersRaw.map(JSON.parse);

      if (callback && typeof callback === 'function') {
        callback({ status: 'success', activeUsers });
      }
    } catch (error) {
      logger.error(`Error requesting active users for channel ${channelId} by user ${user.username}:`, error.message);
      if (callback && typeof callback === 'function') {
        callback({ status: 'error', message: error.message, code: httpStatus.INTERNAL_SERVER_ERROR });
      }
    }
  });


  // --- Event: disconnect ---
  socket.on('disconnect', async () => {
    logger.info(`User ${user.username} (ID: ${user.id}) disconnected from WebSocket.`);

    // Find all rooms the user was in and remove them from active users lists
    const rooms = Array.from(socket.rooms); // Socket.io rooms include socket.id itself
    const userString = JSON.stringify({ id: user.id, username: user.username });

    for (const channelId of rooms) {
      if (channelId !== socket.id) { // Exclude the default room which is the socket ID
        await cache.getClient().sRem(`${ACTIVE_USERS_PREFIX}${channelId}`, userString);
        await cache.getClient().zRem(`${TYPING_USERS_PREFIX}${channelId}`, userString);
        io.to(channelId).emit('userLeftChannel', { userId: user.id, username: user.username, channelId });
        io.to(channelId).emit('typingStop', { userId: user.id, username: user.username, channelId });
        logger.debug(`User ${user.username} automatically left channel ${channelId} on disconnect.`);
      }
    }
  });
};

export default registerSocketHandlers;
```