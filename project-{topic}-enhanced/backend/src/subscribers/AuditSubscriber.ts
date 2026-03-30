import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { User } from '../entities/User';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';
import logger from '../config/logger';

// A generic type to represent an entity that has an ID
interface IdentifiableEntity {
  id: string;
  constructor: Function;
}

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<IdentifiableEntity> {
  // You can specify the entities to listen to or listen to all entities
  listenTo() {
    return [User, Project, Task];
  }

  afterInsert(event: InsertEvent<IdentifiableEntity>) {
    const entity = event.entity;
    logger.info(`[AUDIT] INSERTED ${entity.constructor.name} with ID: ${entity.id}`);
  }

  afterUpdate(event: UpdateEvent<IdentifiableEntity>) {
    const entity = event.entity;
    if (entity) {
      const changedColumns = event.updatedColumns.map(col => col.propertyName);
      logger.info(`[AUDIT] UPDATED ${entity.constructor.name} with ID: ${entity.id}. Changed fields: ${changedColumns.join(', ')}`);
    }
  }

  afterRemove(event: RemoveEvent<IdentifiableEntity>) {
    const entity = event.entity;
    if (entity) {
      logger.info(`[AUDIT] REMOVED ${entity.constructor.name} with ID: ${entity.id}`);
    }
  }
}
```
*Note*: To enable this subscriber, add `AuditSubscriber` to the `subscribers` array in `backend/src/config/data-source.ts`.

---

### 2. Frontend Implementation (React, TypeScript)

The frontend uses React with `react-router-dom` for navigation and `axios` for API requests. It features a simple authentication context for managing user state.

#### `frontend/package.json`
```json