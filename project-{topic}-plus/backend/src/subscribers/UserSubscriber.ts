```typescript
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { User } from '../entities/User';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User;
  }

  async beforeInsert(event: InsertEvent<User>) {
    if (event.entity.password) {
      event.entity.password = await bcrypt.hash(event.entity.password, 10);
      logger.debug(`User ${event.entity.email} password hashed before insert.`);
    }
  }

  async beforeUpdate(event: UpdateEvent<User>) {
    // Check if the password field is being updated and has changed
    const entity = event.entity;
    const databaseEntity = event.databaseEntity;

    if (entity instanceof User && databaseEntity instanceof User && entity.password && entity.password !== databaseEntity.password) {
      entity.password = await bcrypt.hash(entity.password, 10);
      logger.debug(`User ${entity.email} password hashed before update.`);
    }
  }
}
```