```typescript
import { AppDataSource } from '../database/data-source';
import { Room } from '../database/entities/Room';
import ApiError from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';
import { cache } from '../utils/cache';

const roomRepository = AppDataSource.getRepository(Room);

const createRoom = async (roomData: Partial<Room>): Promise<Room> => {
  if (await roomRepository.findOneBy({ name: roomData.name })) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Room with this name already exists');
  }
  const room = roomRepository.create(roomData);
  await roomRepository.save(room);
  await cache.del('allRooms'); // Invalidate cache for all rooms list
  logger.info(`Room created: ${room.name}`);
  return room;
};

const getRoomById = async (id: string): Promise<Room | null> => {
  const cacheKey = `room:${id}`;
  return cache.wrap(cacheKey, () => roomRepository.findOneBy({ id }), 600); // Cache for 10 minutes
};

const getAllRooms = async (): Promise<Room[]> => {
  const cacheKey = 'allRooms';
  return cache.wrap(cacheKey, () => roomRepository.find(), 300); // Cache for 5 minutes
};

const updateRoomById = async (id: string, updateBody: Partial<Room>): Promise<Room | null> => {
  const room = await roomRepository.findOneBy({ id });
  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Room not found');
  }

  if (updateBody.name && updateBody.name !== room.name && await roomRepository.findOneBy({ name: updateBody.name })) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Room with this name already exists');
  }

  Object.assign(room, updateBody);
  await roomRepository.save(room);
  await cache.del(`room:${id}`); // Invalidate specific room cache
  await cache.del('allRooms'); // Invalidate all rooms list
  logger.info(`Room updated: ${room.name}`);
  return room;
};

const deleteRoomById = async (id: string): Promise<void> => {
  const room = await roomRepository.findOneBy({ id });
  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Room not found');
  }
  await roomRepository.remove(room);
  await cache.del(`room:${id}`); // Invalidate specific room cache
  await cache.del('allRooms'); // Invalidate all rooms list
  logger.info(`Room deleted: ${room.name}`);
};

export default {
  createRoom,
  getRoomById,
  getAllRooms,
  updateRoomById,
  deleteRoomById,
};
```