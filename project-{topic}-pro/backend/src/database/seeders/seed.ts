```typescript
import 'reflect-metadata';
import { AppDataSource } from '../../config/data-source';
import { User } from '../entities/User';
import { Task } from '../entities/Task';
import { hashPassword } from '../../utils/passwordUtils';
import { logger } from '../../utils/logger';

async function seed() {
    try {
        await AppDataSource.initialize();
        logger.info('Data Source initialized for seeding!');

        // Clear existing data (optional, use with caution)
        await AppDataSource.getRepository(Task).delete({});
        await AppDataSource.getRepository(User).delete({});
        logger.info('Cleared existing users and tasks.');

        // Create users
        const hashedPassword1 = await hashPassword('password123');
        const hashedPassword2 = await hashPassword('password123');

        const user1 = AppDataSource.getRepository(User).create({
            username: 'alice',
            email: 'alice@example.com',
            password: hashedPassword1,
        });
        await AppDataSource.getRepository(User).save(user1);

        const user2 = AppDataSource.getRepository(User).create({
            username: 'bob',
            email: 'bob@example.com',
            password: hashedPassword2,
        });
        await AppDataSource.getRepository(User).save(user2);

        logger.info('Created 2 users.');

        // Create tasks for user1
        const task1_1 = AppDataSource.getRepository(Task).create({
            title: 'Complete project proposal',
            description: 'Draft and finalize the project proposal document.',
            status: 'in-progress',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            user: user1,
            userId: user1.id
        });
        const task1_2 = AppDataSource.getRepository(Task).create({
            title: 'Schedule team meeting',
            description: 'Find a suitable time for the weekly team sync-up.',
            status: 'pending',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            user: user1,
            userId: user1.id
        });
        const task1_3 = AppDataSource.getRepository(Task).create({
            title: 'Review PR #123',
            description: 'Code review for feature branch.',
            status: 'completed',
            dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            user: user1,
            userId: user1.id
        });
        await AppDataSource.getRepository(Task).save([task1_1, task1_2, task1_3]);

        // Create tasks for user2
        const task2_1 = AppDataSource.getRepository(Task).create({
            title: 'Prepare Q3 financial report',
            description: 'Gather all financial data and prepare the Q3 report for stakeholders.',
            status: 'in-progress',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            user: user2,
            userId: user2.id
        });
        const task2_2 = AppDataSource.getRepository(Task).create({
            title: 'Onboard new hire',
            description: 'Set up accounts and introduce the new team member to the project.',
            status: 'pending',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            user: user2,
            userId: user2.id
        });
        await AppDataSource.getRepository(Task).save([task2_1, task2_2]);

        logger.info('Created tasks for users.');
        logger.info('Seeding complete!');
    } catch (error) {
        logger.error('Seeding failed:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            logger.info('Data Source closed.');
        }
    }
}

seed();
```