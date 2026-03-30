import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';

export const UserRepository = AppDataSource.getRepository(User).extend({
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  },

  async findById(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  },
});
```

#### `backend/src/repositories/ProjectRepository.ts`
```typescript