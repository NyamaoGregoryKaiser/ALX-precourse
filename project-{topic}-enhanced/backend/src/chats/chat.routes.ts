```typescript
import { Router } from 'express';
import { chatController } from './chat.controller';
import { protect } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(protect); // All chat routes require authentication
router.use(apiRateLimiter); // Apply rate limiting

router.post('/', chatController.createChatRoom);
router.get('/', chatController.getUserChatRooms); // Get all chat rooms for the authenticated user
router.post('/join', chatController.joinChatRoom); // Join an existing chat room by ID
router.get('/:id', chatController.getChatRoom); // Get details of a specific chat room
router.get('/:id/messages', chatController.getMessages); // Get message history for a chat room
router.post('/:id/messages', chatController.sendMessage); // Send a message (for persistence, real-time via sockets)

export default router;
```