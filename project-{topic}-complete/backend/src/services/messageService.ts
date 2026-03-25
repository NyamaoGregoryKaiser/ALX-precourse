```typescript
import { AppDataSource } from '../database/data-source';
import { Message } from '../database/entities/Message';
import ApiError from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';
import { cache } from '../utils/cache';

const messageRepository = AppDataSource.getRepository(Message);

const createMessage = async (
  roomId: string,
  senderId: string,
  senderName: string,
  content: string
): Promise<Message> => {
  const message = messageRepository.create({
    roomId,
    senderId,
    senderName,
    content,
  });
  await messageRepository.save(message);
  // No specific cache invalidation for general messages,
  // but if we had a cache for "recent messages in room X", it would be invalidated.
  // For historical fetches, we don't cache deeply as they are usually paginated.
  logger.debug(`Message sent in room ${roomId} by ${senderName}: ${content.substring(0, 50)}`);
  return message;
};

const getMessagesInRoom = async (
  roomId: string,
  page: number = 1,
  limit: number = 50
): Promise<Message[]> => {
  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 50; // Cap limit

  const cacheKey = `messages:room:${roomId}:page:${page}:limit:${limit}`;
  return cache.wrap(cacheKey, async () => {
    logger.debug(`Fetching messages for room ${roomId}, page ${page}, limit ${limit}`);
    const messages = await messageRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' }, // Newest first
      skip: (page - 1) * limit,
      take: limit,
      relations: ['sender'], // Eager load sender if needed for more details
    });
    // Reverse messages to show oldest first for chat display (optional, can be done on frontend)
    return messages.reverse();
  }, 60); // Cache for 1 minute, as messages are frequent
};

// No update/delete message by API, usually only a "soft delete" or "edit" feature for chat messages.
// For simplicity, we assume messages are immutable once sent.

export default {
  createMessage,
  getMessagesInRoom,
};
```