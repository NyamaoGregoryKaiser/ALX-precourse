```javascript
import express from 'express';
import httpStatus from 'http-status';
import channelService from '../services/channelService.js';
import auth from '../middleware/auth.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

/**
 * @route POST /api/channels
 * @description Create a new chat channel
 * @access Private
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Channel name is required');
    }
    const channel = await channelService.createChannel({ name, description, ownerId: req.user.id });
    res.status(httpStatus.CREATED).send(channel);
  } catch (error) {
    logger.error('Error creating channel:', error.message);
    next(error);
  }
});

/**
 * @route GET /api/channels
 * @description Get all available channels
 * @access Private
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const channels = await channelService.getAllChannels();
    res.status(httpStatus.OK).send(channels);
  } catch (error) {
    logger.error('Error fetching all channels:', error.message);
    next(error);
  }
});

/**
 * @route GET /api/channels/:channelId
 * @description Get a specific channel by ID
 * @access Private
 */
router.get('/:channelId', auth, async (req, res, next) => {
  try {
    const channel = await channelService.getChannelById(req.params.channelId);
    res.status(httpStatus.OK).send(channel);
  } catch (error) {
    logger.error(`Error fetching channel ${req.params.channelId}:`, error.message);
    next(error);
  }
});

/**
 * @route POST /api/channels/:channelId/join
 * @description Add current authenticated user to a channel
 * @access Private
 */
router.post('/:channelId/join', auth, async (req, res, next) => {
  try {
    await channelService.addUserToChannel(req.params.channelId, req.user.id);
    res.status(httpStatus.OK).send({ message: 'User successfully joined channel' });
  } catch (error) {
    logger.error(`Error joining channel ${req.params.channelId} for user ${req.user.id}:`, error.message);
    next(error);
  }
});

/**
 * @route POST /api/channels/:channelId/leave
 * @description Remove current authenticated user from a channel
 * @access Private
 */
router.post('/:channelId/leave', auth, async (req, res, next) => {
  try {
    await channelService.removeUserFromChannel(req.params.channelId, req.user.id);
    res.status(httpStatus.OK).send({ message: 'User successfully left channel' });
  } catch (error) {
    logger.error(`Error leaving channel ${req.params.channelId} for user ${req.user.id}:`, error.message);
    next(error);
  }
});

/**
 * @route GET /api/channels/:channelId/members
 * @description Get members of a specific channel
 * @access Private
 */
router.get('/:channelId/members', auth, async (req, res, next) => {
  try {
    // Ensure the requesting user is a member of the channel
    const isMember = await channelService.checkUserMembership(req.params.channelId, req.user.id);
    if (!isMember) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this channel');
    }

    const members = await channelService.getChannelMembers(req.params.channelId);
    res.status(httpStatus.OK).send(members);
  } catch (error) {
    logger.error(`Error fetching members for channel ${req.params.channelId}:`, error.message);
    next(error);
  }
});

/**
 * @route DELETE /api/channels/:channelId
 * @description Delete a channel (only by owner)
 * @access Private
 */
router.delete('/:channelId', auth, async (req, res, next) => {
  try {
    await channelService.deleteChannel(req.params.channelId, req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    logger.error(`Error deleting channel ${req.params.channelId} by user ${req.user.id}:`, error.message);
    next(error);
  }
});

export default router;
```