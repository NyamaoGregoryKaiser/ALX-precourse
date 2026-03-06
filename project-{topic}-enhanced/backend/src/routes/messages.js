```javascript
import express from 'express';
import httpStatus from 'http-status';
import messageService from '../services/messageService.js';
import auth from '../middleware/auth.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

/**
 * @route POST /api/messages/:channelId
 * @description Send a new message to a channel
 * @access Private
 */
router.post('/:channelId', auth, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Message content is required');
    }
    const message = await messageService.sendMessage(req.user.id, req.params.channelId, content);
    res.status(httpStatus.CREATED).send(message);
  } catch (error) {
    logger.error(`Error sending message to channel ${req.params.channelId} by user ${req.user.id}:`, error.message);
    next(error);
  }
});

/**
 * @route GET /api/messages/:channelId
 * @description Get message history for a channel with pagination
 * @access Private
 */
router.get('/:channelId', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor; // Optional: message ID to start fetching from

    const messages = await messageService.getChannelMessages(req.params.channelId, limit, cursor);
    res.status(httpStatus.OK).send(messages);
  } catch (error) {
    logger.error(`Error fetching messages for channel ${req.params.channelId}:`, error.message);
    next(error);
  }
});

/**
 * @route DELETE /api/messages/:messageId
 * @description Delete a message (only by message owner)
 * @access Private
 */
router.delete('/:messageId', auth, async (req, res, next) => {
  try {
    await messageService.deleteMessage(req.params.messageId, req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    logger.error(`Error deleting message ${req.params.messageId} by user ${req.user.id}:`, error.message);
    next(error);
  }
});

export default router;
```

### Frontend (React.js)