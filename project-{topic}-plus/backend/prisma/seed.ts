```typescript
import { PrismaClient, UserStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/hash';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create users
  const user1Password = await hashPassword('password123');
  const user2Password = await hashPassword('password123');
  const user3Password = await hashPassword('password123');

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      username: 'Alice',
      email: 'alice@example.com',
      passwordHash: user1Password,
      status: UserStatus.ONLINE,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      username: 'Bob',
      email: 'bob@example.com',
      passwordHash: user2Password,
      status: UserStatus.OFFLINE,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      username: 'Charlie',
      email: 'charlie@example.com',
      passwordHash: user3Password,
      status: UserStatus.ONLINE,
    },
  });

  console.log(`Created users: ${user1.username}, ${user2.username}, ${user3.username}`);

  // Create a direct message conversation between Alice and Bob
  const dmConversation = await prisma.conversation.upsert({
    where: { id: 'dm-alice-bob' }, // Use a predictable ID for upsert
    update: {},
    create: {
      id: 'dm-alice-bob',
      isGroup: false,
      participants: {
        create: [{ userId: user1.id }, { userId: user2.id }],
      },
    },
  });
  console.log(`Created DM conversation: ${dmConversation.id}`);

  // Create a group conversation with all users
  const groupConversation = await prisma.conversation.upsert({
    where: { id: 'group-all-users' },
    update: {},
    create: {
      id: 'group-all-users',
      name: 'All Users Chat',
      isGroup: true,
      participants: {
        create: [{ userId: user1.id }, { userId: user2.id }, { userId: user3.id }],
      },
    },
  });
  console.log(`Created Group conversation: ${groupConversation.id}`);

  // Add messages to DM conversation
  const dmMessage1 = await prisma.message.create({
    data: {
      conversationId: dmConversation.id,
      senderId: user1.id,
      content: 'Hey Bob, how are you doing?',
    },
  });
  const dmMessage2 = await prisma.message.create({
    data: {
      conversationId: dmConversation.id,
      senderId: user2.id,
      content: 'Hi Alice! I am good, thanks. How about you?',
    },
  });

  // Update last message for DM conversation
  await prisma.conversation.update({
    where: { id: dmConversation.id },
    data: { lastMessageId: dmMessage2.id },
  });
  console.log(`Added messages to DM conversation.`);

  // Add messages to group conversation
  const groupMessage1 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: user1.id,
      content: 'Hello everyone! Welcome to the group chat.',
    },
  });
  const groupMessage2 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: user3.id,
      content: 'Hi Alice! Glad to be here.',
    },
  });
  const groupMessage3 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: user2.id,
      content: 'Greetings from Bob!',
    },
  });

  // Update last message for Group conversation
  await prisma.conversation.update({
    where: { id: groupConversation.id },
    data: { lastMessageId: groupMessage3.id },
  });
  console.log(`Added messages to Group conversation.`);

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