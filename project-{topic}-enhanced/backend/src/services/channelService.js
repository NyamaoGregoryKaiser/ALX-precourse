```javascript
import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import channelRepository from '../repositories/channelRepository.js';
import userRepository from '../repositories/userRepository.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import cache from '../utils/cache.js';

const CHANNEL_USERS_CACHE_PREFIX = 'channelUsers:';

/**
 * Service for managing chat channels and user membership.
 */
class ChannelService {
  /**
   * Creates a new chat channel.
   * @param {object} channelData - Data for the new channel (name, description, ownerId).
   * @returns {Promise<object>} The created channel object.
   * @throws {ApiError} If channel name already exists or owner not found.
   */
  async createChannel(channelData) {
    const { name, ownerId } = channelData;
    logger.info(`Attempting to create channel: ${name} by user ${ownerId}`);

    if (await channelRepository.findChannelByName(name)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Channel name already taken');
    }

    const owner = await userRepository.findUserById(ownerId);
    if (!owner) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Owner user not found');
    }

    const newChannel = await channelRepository.createChannel({
      id: uuidv4(), // Generate UUID for channel ID
      name,
      description: channelData.description || null,
      ownerId,
      type: 'PUBLIC', // Default to public channels for now
    });

    // Automatically add owner to the channel
    await channelRepository.addUserToChannel(newChannel.id, ownerId);
    await this.clearChannelUsersCache(newChannel.id); // Clear cache after modification

    logger.info(`Channel ${newChannel.name} created and owner ${ownerId} added.`);
    return newChannel;
  }

  /**
   * Gets a channel by its ID.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<object>} The channel object.
   * @throws {ApiError} If channel not found.
   */
  async getChannelById(channelId) {
    logger.debug(`Fetching channel by ID: ${channelId}`);
    const channel = await channelRepository.findChannelById(channelId);
    if (!channel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Channel not found');
    }
    return channel;
  }

  /**
   * Gets all available channels.
   * @returns {Promise<object[]>} An array of channel objects.
   */
  async getAllChannels() {
    logger.debug('Fetching all channels');
    return channelRepository.findAllChannels();
  }

  /**
   * Adds a user to a channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user to add.
   * @returns {Promise<object>} The channel-user relationship.
   * @throws {ApiError} If channel or user not found, or user is already a member.
   */
  async addUserToChannel(channelId, userId) {
    logger.info(`Attempting to add user ${userId} to channel ${channelId}`);
    const channel = await channelRepository.findChannelById(channelId);
    if (!channel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Channel not found');
    }

    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (await channelRepository.isUserInChannel(channelId, userId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User is already a member of this channel');
    }

    const channelUser = await channelRepository.addUserToChannel(channelId, userId);
    await this.clearChannelUsersCache(channelId); // Clear cache after modification
    return channelUser;
  }

  /**
   * Removes a user from a channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user to remove.
   * @returns {Promise<object>} The deleted channel-user relationship.
   * @throws {ApiError} If channel or user not found, or user is not a member.
   */
  async removeUserFromChannel(channelId, userId) {
    logger.info(`Attempting to remove user ${userId} from channel ${channelId}`);
    const channel = await channelRepository.findChannelById(channelId);
    if (!channel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Channel not found');
    }

    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (!(await channelRepository.isUserInChannel(channelId, userId))) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a member of this channel');
    }

    const channelUser = await channelRepository.removeUserFromChannel(channelId, userId);
    await this.clearChannelUsersCache(channelId); // Clear cache after modification
    return channelUser;
  }

  /**
   * Checks if a user is a member of a channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<boolean>} True if the user is a member, false otherwise.
   */
  async checkUserMembership(channelId, userId) {
    logger.debug(`Checking membership for user ${userId} in channel ${channelId}`);
    return channelRepository.isUserInChannel(channelId, userId);
  }

  /**
   * Gets all users belonging to a specific channel, utilizing cache.
   * @param {string} channelId - The ID of the channel.
   * @returns {Promise<object[]>} An array of user objects.
   * @throws {ApiError} If channel not found.
   */
  async getChannelMembers(channelId) {
    logger.debug(`Fetching members for channel ${channelId}`);
    const channel = await channelRepository.findChannelById(channelId);
    if (!channel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Channel not found');
    }

    const cacheKey = `${CHANNEL_USERS_CACHE_PREFIX}${channelId}`;
    let cachedMembers = await cache.get(cacheKey);

    if (cachedMembers) {
      logger.debug(`Cache hit for channel members: ${channelId}`);
      return JSON.parse(cachedMembers);
    }

    const members = await channelRepository.getChannelUsers(channelId);
    await cache.set(cacheKey, JSON.stringify(members), 3600); // Cache for 1 hour
    logger.debug(`Cache miss, fetched and cached members for channel: ${channelId}`);
    return members;
  }

  /**
   * Deletes a channel.
   * @param {string} channelId - The ID of the channel to delete.
   * @param {string} userId - The ID of the user attempting to delete (must be owner).
   * @returns {Promise<object>} The deleted channel object.
   * @throws {ApiError} If channel not found or user is not the owner.
   */
  async deleteChannel(channelId, userId) {
    logger.info(`Attempting to delete channel ${channelId} by user ${userId}`);
    const channel = await channelRepository.findChannelById(channelId);
    if (!channel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Channel not found');
    }

    if (channel.ownerId !== userId) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Only the channel owner can delete this channel');
    }

    const deletedChannel = await channelRepository.deleteChannel(channelId);
    await this.clearChannelUsersCache(channelId); // Clear cache after modification
    logger.info(`Channel ${channelId} deleted by owner ${userId}.`);
    return deletedChannel;
  }

  /**
   * Clears the cache for channel members.
   * @param {string} channelId
   */
  async clearChannelUsersCache(channelId) {
    const cacheKey = `${CHANNEL_USERS_CACHE_PREFIX}${channelId}`;
    await cache.del(cacheKey);
    logger.debug(`Cleared cache for channel users: ${channelId}`);
  }
}

export default new ChannelService();
```