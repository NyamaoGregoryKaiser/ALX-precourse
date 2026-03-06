```javascript
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * Message repository layer for interacting with the database.
 * Abstracts Prisma client operations for messages.
 */
class MessageRepository {
  /**
   * Creates a new message in a channel.
   * @param {object} messageData - Data for the new message (content, userId, channelId).
   * @returns {Promise<object>} The created message object.
   */
  async createMessage(messageData) {
    logger.debug(`Creating message for channel ${messageData.channelId} by user ${messageData.userId}`);
    try {
      const message = await prisma.message.create({
        data: messageData,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      logger.info(`Message created in channel ${messageData.channelId} by ${messageData.userId}`);
      return message;
    } catch (error) {
      logger.error(`Error creating message for channel ${messageData.channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieves messages for a specific channel, with pagination.
   * @param {string} channelId - The ID of the channel.
   * @param {number} [limit=50] - The maximum number of messages to retrieve.
   * @param {string} [cursor] - The ID of the message to start fetching from (for infinite scroll).
   * @returns {Promise<object[]>} An array of message objects.
   */
  async getChannelMessages(channelId, limit = 50, cursor = undefined) {
    logger.debug(`Fetching messages for channel ${channelId}, limit: ${limit}, cursor: ${cursor}`);
    try {
      const findManyArgs = {
        where: { channelId },
        take: limit,
        orderBy: { createdAt: 'desc' }, // Get most recent messages first
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      };

      if (cursor) {
        // For infinite scroll: fetch messages older than the cursor
        findManyArgs.cursor = { id: cursor };
        findManyArgs.skip = 1; // Skip the cursor message itself
      }

      const messages = await prisma.message.findMany(findManyArgs);

      // Prisma returns in 'desc' order, reverse for chronological display
      return messages.reverse();
    } catch (error) {
      logger.error(`Error fetching messages for channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds a message by its ID.
   * @param {string} messageId - The ID of the message.
   * @returns {Promise<object|null>} The message object or null if not found.
   */
  async findMessageById(messageId) {
    logger.debug(`Finding message by ID: ${messageId}`);
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      return message;
    } catch (error) {
      logger.error(`Error finding message by ID ${messageId}:`, error.message);
      throw error;
    }
  }

  /**
   * Deletes a message by its ID.
   * @param {string} messageId - The ID of the message to delete.
   * @returns {Promise<object>} The deleted message object.
   */
  async deleteMessage(messageId) {
    logger.debug(`Deleting message ID: ${messageId}`);
    try {
      const message = await prisma.message.delete({
        where: { id: messageId },
        select: {
          id: true,
          channelId: true,
        },
      });
      logger.info(`Message ID ${messageId} deleted successfully.`);
      return message;
    } catch (error) {
      logger.error(`Error deleting message ID ${messageId}:`, error.message);
      throw error;
    }
  }
}

export default new MessageRepository();
```