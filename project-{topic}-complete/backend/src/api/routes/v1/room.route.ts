```typescript
import { Router } from 'express';
import roomController from '../../controllers/room.controller';
import { authenticate, authorize } from '../../../middlewares/auth';
import validationMiddleware from '../../../middlewares/validate';
import { CreateRoomDto, UpdateRoomDto, RoomIdParam } from '../../validators/room.validation';
import { GetMessagesQueryDto } from '../../validators/message.validation';

const router = Router();

router
  .route('/')
  .post(authenticate, validationMiddleware(CreateRoomDto), roomController.createRoom)
  .get(authenticate, roomController.getRooms);

router
  .route('/:id')
  .get(authenticate, validationMiddleware(RoomIdParam, 'params'), roomController.getRoom)
  .patch(authenticate, authorize('admin'), validationMiddleware(RoomIdParam, 'params'), validationMiddleware(UpdateRoomDto), roomController.updateRoom)
  .delete(authenticate, authorize('admin'), validationMiddleware(RoomIdParam, 'params'), roomController.deleteRoom);

router.get('/:id/messages', authenticate, validationMiddleware(RoomIdParam, 'params'), validationMiddleware(GetMessagesQueryDto, 'query'), roomController.getRoomMessages);

export default router;
```