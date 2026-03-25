```typescript
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Room } from '../entities/Room';
import { Message } from '../entities/Message';
import logger from '../../utils/logger';
import config from '../../config';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  if (config.env === 'production') {
    logger.warn('Skipping seeding in production environment.');
    return;
  }

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    logger.info('Starting database seeding...');

    // Clear existing data (optional, for development)
    await AppDataSource.getRepository(Message).delete({});
    await AppDataSource.getRepository(Room).delete({});
    await AppDataSource.getRepository(User).delete({});
    logger.info('Cleared existing data.');

    // Create Users
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('password123', 10);

    const user1 = AppDataSource.getRepository(User).create({
      username: 'alice',
      email: 'alice@example.com',
      password: hashedPassword1, // Already hashed
    });

    const user2 = AppDataSource.getRepository(User).create({
      username: 'bob',
      email: 'bob@example.com',
      password: hashedPassword2, // Already hashed
    });

    await AppDataSource.getRepository(User).save([user1, user2]);
    logger.info('Created users: Alice, Bob');

    // Create Rooms
    const room1 = AppDataSource.getRepository(Room).create({
      name: 'general',
      description: 'General discussion room',
    });
    const room2 = AppDataSource.getRepository(Room).create({
      name: 'developers',
      description: 'Talk about code and development',
    });

    await AppDataSource.getRepository(Room).save([room1, room2]);
    logger.info('Created rooms: General, Developers');

    // Create Messages
    const message1 = AppDataSource.getRepository(Message).create({
      content: 'Hello everyone!',
      senderId: user1.id,
      senderName: user1.username,
      roomId: room1.id,
    });

    const message2 = AppDataSource.getRepository(Message).create({
      content: 'Hi Alice! Welcome to the general chat.',
      senderId: user2.id,
      senderName: user2.username,
      roomId: room1.id,
    });

    const message3 = AppDataSource.getRepository(Message).create({
      content: 'Any thoughts on the new TypeScript features?',
      senderId: user1.id,
      senderName: user1.username,
      roomId: room2.id,
    });

    await AppDataSource.getRepository(Message).save([message1, message2, message3]);
    logger.info('Created initial messages.');

    logger.info('Database seeding completed!');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy(); // Close connection if opened just for seeding
    }
  }
};

if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
```