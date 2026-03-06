```javascript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create initial users
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: hashedPassword,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: hashedPassword,
    },
  });

  console.log('Users created:', { user1, user2, user3 });

  // Create initial channels
  const generalChannel = await prisma.channel.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'general',
      description: 'General discussions',
      ownerId: user1.id,
      type: 'PUBLIC',
    },
  });

  const randomChannel = await prisma.channel.upsert({
    where: { name: 'random' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'random',
      description: 'Random thoughts and fun stuff',
      ownerId: user2.id,
      type: 'PUBLIC',
    },
  });

  console.log('Channels created:', { generalChannel, randomChannel });

  // Add users to channels (general channel for all, random for user2, user3)
  await prisma.channelUser.upsert({
    where: { channelId_userId: { channelId: generalChannel.id, userId: user1.id } },
    update: {},
    create: { channelId: generalChannel.id, userId: user1.id },
  });
  await prisma.channelUser.upsert({
    where: { channelId_userId: { channelId: generalChannel.id, userId: user2.id } },
    update: {},
    create: { channelId: generalChannel.id, userId: user2.id },
  });
  await prisma.channelUser.upsert({
    where: { channelId_userId: { channelId: generalChannel.id, userId: user3.id } },
    update: {},
    create: { channelId: generalChannel.id, userId: user3.id },
  });
  await prisma.channelUser.upsert({
    where: { channelId_userId: { channelId: randomChannel.id, userId: user2.id } },
    update: {},
    create: { channelId: randomChannel.id, userId: user2.id },
  });
  await prisma.channelUser.upsert({
    where: { channelId_userId: { channelId: randomChannel.id, userId: user3.id } },
    update: {},
    create: { channelId: randomChannel.id, userId: user3.id },
  });

  console.log('Users added to channels.');

  // Create some messages
  await prisma.message.createMany({
    data: [
      { id: uuidv4(), content: 'Hi everyone, welcome to the general chat!', userId: user1.id, channelId: generalChannel.id },
      { id: uuidv4(), content: 'Hello Alice! Glad to be here.', userId: user2.id, channelId: generalChannel.id },
      { id: uuidv4(), content: 'Hey guys! This chat app is awesome.', userId: user3.id, channelId: generalChannel.id },
      { id: uuidv4(), content: 'Any plans for the weekend?', userId: user2.id, channelId: randomChannel.id },
      { id: uuidv4(), content: 'Just chilling, maybe some coding.', userId: user3.id, channelId: randomChannel.id },
    ],
  });

  console.log('Messages created.');
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Query Optimization
*   **Indexes:** The `schema.prisma` file includes:
    *   `@@unique` constraints on `User.username`, `User.email`, `Channel.name` for efficient lookups.
    *   `@@index([channelId, createdAt])` on `Message` model to optimize fetching messages for a specific channel ordered by time, which is critical for chat history.
*   **Prisma Client:** Prisma generates optimized SQL queries based on the operations, handling connection pooling and query preparation.
*   **Caching (Redis):** Implemented in `backend/src/utils/cache.js` and utilized in `channelService.js` (`CHANNEL_USERS_CACHE_PREFIX`) and `messageService.js` (`CHANNEL_MESSAGES_CACHE_PREFIX`) to reduce database load for frequently accessed data like channel members and recent messages.

---

## 3. Configuration & Setup

### Docker Setup