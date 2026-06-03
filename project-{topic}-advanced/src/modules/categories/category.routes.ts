```typescript
import { Router } from 'express';
import * as categoryController from './category.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required').max(100, 'Category name cannot exceed 100 characters'),
  }),
});

const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Category name is required').max(100, 'Category name cannot exceed 100 characters'),
  }),
});

const getCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID format'),
  }),
});

const router = Router();

router.use(authenticateToken); // All category routes require authentication

router.route('/')
  .post(validate(createCategorySchema), categoryController.createCategory)
  .get(categoryController.getAllCategories);

router.route('/:id')
  .get(validate(getCategorySchema), categoryController.getCategoryById)
  .patch(validate(updateCategorySchema), categoryController.updateCategory)
  .delete(validate(getCategorySchema), categoryController.deleteCategory);

export default router;
```

**Module: Tasks**