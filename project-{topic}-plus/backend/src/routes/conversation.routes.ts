```typescript
import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller';
import { authenticateToken } from '../middlewares/auth';
import { validate, conversationValidation } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken); // All conversation routes require authentication

router.get('/', conversationController.getConversations);
router.post('/', validate(conversationValidation.createConversation, 'body'), conversationController.createConversation);
router.get('/:conversationId', validate(conversationValidation.getConversationById, 'params'), conversationController.getConversationById);

export default router;
```