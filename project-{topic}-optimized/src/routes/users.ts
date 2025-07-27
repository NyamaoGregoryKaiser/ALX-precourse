```typescript
import express from 'express';
import { getUser, createUser, updateUser, deleteUser } from '../controllers/users';

export const userRouter = express.Router();

userRouter.get('/:id', getUser);
userRouter.post('/', createUser);
userRouter.put('/:id', updateUser);
userRouter.delete('/:id', deleteUser);

```