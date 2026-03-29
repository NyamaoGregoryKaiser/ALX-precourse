import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { User } from '@/entities/User';
import bcrypt from 'bcryptjs';
import logger from '@/utils/logger';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User;
  }

  async beforeInsert(event: InsertEvent<User>) {
    if (event.entity.password) {
      event.entity.password = await bcrypt.hash(event.entity.password, 10);
      logger.debug(`Password hashed for new user: ${event.entity.username}`);
    }
  }

  async beforeUpdate(event: UpdateEvent<User>) {
    if (event.entity.password && event.entity.password !== event.databaseEntity.password) {
      event.entity.password = await bcrypt.hash(event.entity.password, 10);
      logger.debug(`Password re-hashed for updated user: ${event.entity.username}`);
    }
  }
}