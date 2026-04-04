```typescript
import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticateToken } from '../middlewares/auth';
import { validate, messageValidation } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken); // All message routes require authentication

// POST /api/conversations/:conversationId/messages - send message (REST fallback)
router.post(
  '/:conversationId/messages',
  validate(conversationValidation.getConversationById, 'params'), // Validate conversationId
  validate(messageValidation.sendMessage, 'body'),
  messageController.sendMessage
);

// GET /api/conversations/:conversationId/messages - get messages for a conversation
router.get(
  '/:conversationId/messages',
  validate(conversationValidation.getConversationById, 'params'),
  messageController.getMessages
);

export default router;
```