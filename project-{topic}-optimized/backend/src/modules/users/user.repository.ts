```typescript
import { Repository, DeepPartial, QueryRunner } from 'typeorm';
import { User } from '../../database/entities/User';
import { AppDataSource } from '../../database/data-source';
import { AppError } from '../../utils/appError';

export class UserRepository {
    private ormRepository: Repository<User>;

    constructor() {
        this.ormRepository = AppDataSource.getRepository(User);
    }

    public async create(userData: DeepPartial<User>, queryRunner?: QueryRunner): Promise<User> {
        const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.ormRepository;
        const newUser = repo.create(userData);
        return await repo.save(newUser);
    }

    public async findById(id: string): Promise<User | null> {
        return await this.ormRepository.findOne({ where: { id } });
    }

    public async findByEmail(email: string): Promise<User | null> {
        return await this.ormRepository.findOne({ where: { email } });
    }

    public async findByEmailWithPassword(email: string): Promise<User | null> {
        return await this.ormRepository
            .createQueryBuilder('user')
            .addSelect('user.password') // Explicitly select password
            .where('user.email = :email', { email })
            .getOne();
    }

    public async findAll(): Promise<User[]> {
        return await this.ormRepository.find();
    }

    public async update(id: string, userData: DeepPartial<User>, queryRunner?: QueryRunner): Promise<User> {
        const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.ormRepository;
        const result = await repo.update(id, userData);
        if (result.affected === 0) {
            throw new AppError('User not found or no changes made.', 404);
        }
        const updatedUser = await this.findById(id);
        if (!updatedUser) { // Should not happen if update was successful
            throw new AppError('Could not retrieve updated user.', 500);
        }
        return updatedUser;
    }

    public async delete(id: string): Promise<void> {
        const result = await this.ormRepository.delete(id);
        if (result.affected === 0) {
            throw new AppError('User not found or already deleted.', 404);
        }
    }
}
```