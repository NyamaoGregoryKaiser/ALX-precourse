```typescript
import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { authenticate, authorize, verifyEmailStatus } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { postSchemas } from '../utils/validationSchemas';
import { UserRole } from '../entities/Role';

const router = Router();

// CRUD operations for posts
router.post(
  '/',
  authenticate,
  verifyEmailStatus, // Ensure user has verified email before creating posts
  validate(postSchemas.createPost),
  postController.createPost
);

router.get(
  '/',
  authenticate, // Posts are protected, requires login to view
  postController.getAllPosts
);

router.get(
  '/:postId',
  authenticate,
  validate(postSchemas.getPost),
  postController.getPost
);

router.patch(
  '/:postId',
  authenticate,
  verifyEmailStatus,
  validate(postSchemas.updatePost),
  postController.updatePost
);

router.delete(
  '/:postId',
  authenticate,
  verifyEmailStatus,
  validate(postSchemas.deletePost),
  postController.deletePost
);

export default router;
```