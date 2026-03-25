```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import roomService from '../../services/roomService';
import { CreateRoomDto, UpdateRoomDto, RoomIdParam } from '../validators/room.validation';
import { AuthenticatedRequest } from '../../types';
import messageService from '../../services/messageService';
import { GetMessagesQueryDto } from '../validators/message.validation';

const createRoom = catchAsync(async (req: AuthenticatedRequest<any, any, CreateRoomDto>, res: Response) => {
  const room = await roomService.createRoom(req.body);
  res.status(StatusCodes.CREATED).send(room);
});

const getRooms = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const rooms = await roomService.getAllRooms();
  res.status(StatusCodes.OK).send(rooms);
});

const getRoom = catchAsync(async (req: AuthenticatedRequest<RoomIdParam>, res: Response) => {
  const room = await roomService.getRoomById(req.params.id);
  if (!room) {
    return res.status(StatusCodes.NOT_FOUND).send({ message: 'Room not found' });
  }
  res.status(StatusCodes.OK).send(room);
});

const updateRoom = catchAsync(async (req: AuthenticatedRequest<RoomIdParam, any, UpdateRoomDto>, res: Response) => {
  const room = await roomService.updateRoomById(req.params.id, req.body);
  if (!room) {
    return res.status(StatusCodes.NOT_FOUND).send({ message: 'Room not found' });
  }
  res.status(StatusCodes.OK).send(room);
});

const deleteRoom = catchAsync(async (req: AuthenticatedRequest<RoomIdParam>, res: Response) => {
  await roomService.deleteRoomById(req.params.id);
  res.status(StatusCodes.NO_CONTENT).send();
});

const getRoomMessages = catchAsync(async (req: AuthenticatedRequest<RoomIdParam, any, any, GetMessagesQueryDto>, res: Response) => {
  const { page, limit } = req.query;
  const messages = await messageService.getMessagesInRoom(req.params.id, page, limit);
  res.status(StatusCodes.OK).send(messages);
});

export default {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  getRoomMessages,
};
```