```typescript
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { AppDataSource } from '../../database/data-source';

export class UserRepository {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(user);
    (newUser as any).setNew(true); // Mark as new for BeforeInsert hook
    await newUser.hashPassword(); // Manually call the hook if not directly saving
    return this.userRepository.save(newUser);
  }

  async update(id: string, userUpdates: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;

    Object.assign(user, userUpdates);
    if (userUpdates.password) {
      (user as any).markModified('password'); // Mark password as modified for BeforeUpdate hook
    }
    await user.hashPassword(); // Manually call the hook if not directly saving
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<boolean> {
    const deleteResult = await this.userRepository.delete(id);
    return deleteResult.affected === 1;
  }
}
```