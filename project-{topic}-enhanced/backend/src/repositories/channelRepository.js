```javascript
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * Channel repository layer for interacting with the database.
 * Abstracts Prisma client operations for channels.
 */
class ChannelRepository {
  /**
   * Creates a new chat channel.
   * @param {object} channelData - Data for the new channel (name, description, ownerId, type).
   * @returns {Promise<object>} The created channel object.
   */
  async createChannel(channelData) {
    logger.debug(`Creating channel: ${channelData.name}`);
    try {
      const channel = await prisma.channel.create({
        data: channelData,
        select: {
          id: true,
          name: true,
          description: true,
          ownerId: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      logger.info(`Channel created successfully: ${channel.name}`);
      return channel;
    } catch (error) {
      logger.error(`Error creating channel ${channelData.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds a channel by its ID.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<object|null>} The channel object or null if not found.
   */
  async findChannelById(channelId) {
    logger.debug(`Finding channel by ID: ${channelId}`);
    try {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          name: true,
          description: true,
          ownerId: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return channel;
    } catch (error) {
      logger.error(`Error finding channel by ID ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds a channel by its name.
   * @param {string} name - The name of the channel.
   * @returns {Promise<object|null>} The channel object or null if not found.
   */
  async findChannelByName(name) {
    logger.debug(`Finding channel by name: ${name}`);
    try {
      const channel = await prisma.channel.findUnique({
        where: { name },
        select: {
          id: true,
          name: true,
          description: true,
          ownerId: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return channel;
    } catch (error) {
      logger.error(`Error finding channel by name ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds all channels.
   * @returns {Promise<object[]>} An array of all channel objects.
   */
  async findAllChannels() {
    logger.debug('Finding all channels');
    try {
      const channels = await prisma.channel.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          ownerId: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      return channels;
    } catch (error) {
      logger.error('Error finding all channels:', error.message);
      throw error;
    }
  }

  /**
   * Adds a user to a channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user to add.
   * @returns {Promise<object>} The updated channel-user relation.
   */
  async addUserToChannel(channelId, userId) {
    logger.debug(`Adding user ${userId} to channel ${channelId}`);
    try {
      const channelUser = await prisma.channelUser.create({
        data: {
          channelId,
          userId,
        },
      });
      logger.info(`User ${userId} added to channel ${channelId}`);
      return channelUser;
    } catch (error) {
      logger.error(`Error adding user ${userId} to channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Removes a user from a channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user to remove.
   * @returns {Promise<object>} The deleted channel-user relation.
   */
  async removeUserFromChannel(channelId, userId) {
    logger.debug(`Removing user ${userId} from channel ${channelId}`);
    try {
      const channelUser = await prisma.channelUser.delete({
        where: {
          channelId_userId: {
            channelId,
            userId,
          },
        },
      });
      logger.info(`User ${userId} removed from channel ${channelId}`);
      return channelUser;
    } catch (error) {
      logger.error(`Error removing user ${userId} from channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Checks if a user is a member of a channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<boolean>} True if the user is a member, false otherwise.
   */
  async isUserInChannel(channelId, userId) {
    logger.debug(`Checking if user ${userId} is in channel ${channelId}`);
    try {
      const count = await prisma.channelUser.count({
        where: {
          channelId,
          userId,
        },
      });
      return count > 0;
    } catch (error) {
      logger.error(`Error checking user ${userId} in channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Gets all users for a specific channel.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<object[]>} An array of user objects in the channel.
   */
  async getChannelUsers(channelId) {
    logger.debug(`Getting users for channel ${channelId}`);
    try {
      const channelUsers = await prisma.channelUser.findMany({
        where: { channelId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });
      return channelUsers.map((cu) => cu.user);
    } catch (error) {
      logger.error(`Error getting users for channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Deletes a channel by its ID.
   * Note: This will also delete associated messages and channel-user relations due to CASCADE.
   * @param {string} channelId - The ID of the channel to delete.
   * @returns {Promise<object>} The deleted channel object.
   */
  async deleteChannel(channelId) {
    logger.debug(`Deleting channel ID: ${channelId}`);
    try {
      const channel = await prisma.channel.delete({
        where: { id: channelId },
        select: {
          id: true,
          name: true,
        },
      });
      logger.info(`Channel ID ${channelId} deleted successfully.`);
      return channel;
    } catch (error) {
      logger.error(`Error deleting channel ID ${channelId}:`, error.message);
      throw error;
    }
  }
}

export default new ChannelRepository();
```