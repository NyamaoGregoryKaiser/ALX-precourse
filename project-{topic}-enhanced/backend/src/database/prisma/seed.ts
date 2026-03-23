```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  // Create test users
  const hashedPassword1 = await bcrypt.hash('password123', 10);
  const hashedPassword2 = await bcrypt.hash('password456', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@example.com',
      password: hashedPassword1,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@example.com',
      password: hashedPassword2,
    },
  });

  logger.info(`Created/Updated users: ${user1.username}, ${user2.username}`);

  // Create a general chat room
  const generalChat = await prisma.chatRoom.upsert({
    where: { name: 'General Chat' },
    update: {},
    create: {
      name: 'General Chat',
      description: 'A general chat room for everyone.',
      participants: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
        ],
      },
      messages: {
        create: [
          { senderId: user1.id, content: 'Hello everyone! Welcome to the general chat.' },
          { senderId: user2.id, content: 'Hey Alice! Glad to be here.' },
          { senderId: user1.id, content: 'How is everyone doing today?' },
        ],
      },
    },
    include: {
      messages: true,
      participants: true
    }
  });

  logger.info(`Created/Updated chat room: ${generalChat.name} with ${generalChat.messages.length} messages.`);

  // Create a private chat room between Alice and Bob
  const privateChat = await prisma.chatRoom.upsert({
    where: { name: 'Alice & Bob Private Chat' },
    update: {},
    create: {
      name: 'Alice & Bob Private Chat',
      description: 'Private conversation between Alice and Bob.',
      participants: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
        ],
      },
      messages: {
        create: [
          { senderId: user1.id, content: 'Hey Bob, checking in on our project.' },
          { senderId: user2.id, content: 'Hi Alice, all good on my end. Ready for the meeting.' },
        ],
      },
    },
    include: {
      messages: true,
      participants: true
    }
  });

  logger.info(`Created/Updated chat room: ${privateChat.name} with ${privateChat.messages.length} messages.`);

  logger.info('Database seeding complete.');
}

main()
  .catch((e) => {
    logger.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```