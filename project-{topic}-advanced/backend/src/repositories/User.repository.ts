```typescript
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';

export class UserRepository extends Repository<User> {
  // Custom methods can be added here if needed, e.g., findByEmail
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  }
}
```