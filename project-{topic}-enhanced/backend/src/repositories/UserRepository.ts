```typescript
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { AppDataSource } from '../config/database';

/**
 * Custom repository for User entity.
 * Provides additional methods beyond basic CRUD if needed, specific to User operations.
 * This pattern helps centralize database interactions for a specific entity.
 */
export const UserRepository = AppDataSource.getRepository(User).extend({
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy({ email });
  },

  // Add more custom methods here, e.g., findUsersWithProducts, findActiveUsers, etc.
});
```