```javascript
import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss-filters';
import messageRepository from '../repositories/messageRepository.js';
import channelService from './channelService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import cache from '../utils/cache.js';

const CHANNEL_MESSAGES_CACHE_PREFIX = 'channelMessages:';

/**
 * Service for managing message-related business logic.
 */
class MessageService {
  /**
   * Sends a new message to a channel.
   * @param {string} userId - The ID of the user sending the message.
   * @param {string} channelId - The ID of the channel the message is for.
   * @param {string} content - The content of the message.
   * @returns {Promise<object>} The created message object.
   * @throws {ApiError} If channel not found or user is not a member.
   */
  async sendMessage(userId, channelId, content) {
    logger.info(`User ${userId} attempting to send message to channel ${channelId}`);

    // 1. Validate channel and user membership
    await channelService.getChannelById(channelId); // Throws if channel not found
    const isMember = await channelService.checkUserMembership(channelId, userId);
    if (!isMember) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this channel');
    }

    // 2. Sanitize message content to prevent XSS attacks
    const sanitizedContent = xss.inHTMLData(content);
    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Message content cannot be empty or invalid');
    }

    // 3. Create message in DB
    const message = await messageRepository.createMessage({
      id: uuidv4(), // Generate UUID for message ID
      userId,
      channelId,
      content: sanitizedContent,
    });

    // 4. Clear cache for this channel's messages
    await this.clearChannelMessagesCache(channelId);

    logger.info(`Message sent to channel ${channelId} by user ${userId}`);
    return message;
  }

  /**
   * Retrieves messages for a specific channel, utilizing cache.
   * @param {string} channelId - The ID of the channel.
   * @param {number} [limit=50] - The maximum number of messages to retrieve.
   * @param {string} [cursor] - The ID of the message to start fetching from (for infinite scroll).
   * @returns {Promise<object[]>} An array of message objects.
   * @throws {ApiError} If channel not found.
   */
  async getChannelMessages(channelId, limit = 50, cursor = undefined) {
    logger.debug(`Fetching messages for channel ${channelId}, limit: ${limit}, cursor: ${cursor}`);

    await channelService.getChannelById(channelId); // Validate channel exists

    // For simplicity, we'll only cache the *initial* fetch (without cursor)
    // Caching paginated results with cursors is more complex and might not always be beneficial
    const cacheKey = `${CHANNEL_MESSAGES_CACHE_PREFIX}${channelId}`;
    if (!cursor) {
      let cachedMessages = await cache.get(cacheKey);
      if (cachedMessages) {
        logger.debug(`Cache hit for channel messages: ${channelId}`);
        return JSON.parse(cachedMessages);
      }
    }

    const messages = await messageRepository.getChannelMessages(channelId, limit, cursor);

    if (!cursor && messages.length > 0) {
      await cache.set(cacheKey, JSON.stringify(messages), 300); // Cache for 5 minutes
      logger.debug(`Cache miss, fetched and cached initial messages for channel: ${channelId}`);
    } else {
      logger.debug(`Cache miss for paginated messages or no messages for channel: ${channelId}`);
    }

    return messages;
  }

  /**
   * Deletes a message.
   * @param {string} messageId - The ID of the message to delete.
   * @param {string} userId - The ID of the user attempting to delete (must be owner of the message).
   * @returns {Promise<object>} The deleted message object.
   * @throws {ApiError} If message not found or user is not the owner.
   */
  async deleteMessage(messageId, userId) {
    logger.info(`User ${userId} attempting to delete message ${messageId}`);

    const message = await messageRepository.findMessageById(messageId);
    if (!message) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Message not found');
    }

    if (message.userId !== userId) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own messages');
    }

    const deletedMessage = await messageRepository.deleteMessage(messageId);
    await this.clearChannelMessagesCache(deletedMessage.channelId); // Clear cache after modification

    logger.info(`Message ${messageId} deleted by user ${userId}.`);
    return deletedMessage;
  }

  /**
   * Clears the cache for channel messages.
   * @param {string} channelId
   */
  async clearChannelMessagesCache(channelId) {
    const cacheKey = `${CHANNEL_MESSAGES_CACHE_PREFIX}${channelId}`;
    await cache.del(cacheKey);
    logger.debug(`Cleared cache for channel messages: ${channelId}`);
  }
}

export default new MessageService();
```