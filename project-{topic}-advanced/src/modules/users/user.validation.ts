```typescript
import Joi from 'joi';

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  // password should ideally be updated via a separate secure endpoint
});
```