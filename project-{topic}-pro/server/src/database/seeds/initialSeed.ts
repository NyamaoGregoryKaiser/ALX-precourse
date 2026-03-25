import { AppDataSource } from '../../config/data-source';
import { User } from '../entities/User';
import { ChatRoom, ChatRoomType } from '../entities/ChatRoom';
import { ChatRoomParticipant } from '../entities/ChatRoomParticipant';
import logger from '../../config/logger';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for consistent ID generation

interface UserSeedData {
    username: string;
    email: string;
    password?: string; // Optional, will be hashed if provided
}

const seedUsers: UserSeedData[] = [
    { username: 'alice', email: 'alice@example.com', password: 'password123' },
    { username: 'bob', email: 'bob@example.com', password: 'password123' },
    { username: 'charlie', email: 'charlie@example.com', password: 'password123' },
    { username: 'diana', email: 'diana@example.com', password: 'password123' },
];

async function seedDatabase() {
    await AppDataSource.initialize();
    logger.info('Data Source initialized for seeding.');

    const userRepository = AppDataSource.getRepository(User);
    const chatRoomRepository = AppDataSource.getRepository(ChatRoom);
    const participantRepository = AppDataSource.getRepository(ChatRoomParticipant);

    try {
        logger.info('Starting database seeding...');

        // 1. Clear existing data (optional, for idempotent seeding)
        // In a real application, you might want more granular control or just add new data.
        await participantRepository.clear();
        await chatRoomRepository.clear();
        await userRepository.clear();
        logger.info('Cleared existing user, chat room, and participant data.');

        // 2. Create Users
        const createdUsers: User[] = [];
        for (const userData of seedUsers) {
            let user = new User();
            user.id = uuidv4(); // Assign UUID explicitly for consistent seeding if needed
            Object.assign(user, userData);
            await user.hashPassword(); // Hash the password before saving
            createdUsers.push(await userRepository.save(user));
            logger.debug(`Created user: ${user.username}`);
        }
        logger.info(`Created ${createdUsers.length} users.`);

        const alice = createdUsers.find(u => u.username === 'alice');
        const bob = createdUsers.find(u => u.username === 'bob');
        const charlie = createdUsers.find(u => u.username === 'charlie');
        const diana = createdUsers.find(u => u.username === 'diana');

        if (!alice || !bob || !charlie || !diana) {
            logger.error('Failed to find all seeded users. Exiting seed process.');
            return;
        }

        // 3. Create Chat Rooms and Participants

        // Group Chat: "General Discussion"
        let generalChat = new ChatRoom();
        generalChat.id = uuidv4();
        generalChat.name = 'General Discussion';
        generalChat.type = 'group';
        generalChat = await chatRoomRepository.save(generalChat);
        logger.debug(`Created group chat: ${generalChat.name}`);

        const generalParticipants = [alice, bob, charlie, diana];
        for (const user of generalParticipants) {
            const participant = new ChatRoomParticipant();
            participant.userId = user.id;
            participant.chatRoomId = generalChat.id;
            await participantRepository.save(participant);
            logger.debug(`Added ${user.username} to ${generalChat.name}`);
        }

        // Private Chat: Alice & Bob
        let aliceBobChat = new ChatRoom();
        aliceBobChat.id = uuidv4();
        aliceBobChat.name = `${alice.username} & ${bob.username}`; // Naming convention for private chats
        aliceBobChat.type = 'private';
        aliceBobChat = await chatRoomRepository.save(aliceBobChat);
        logger.debug(`Created private chat: ${aliceBobChat.name}`);

        await participantRepository.save({ userId: alice.id, chatRoomId: aliceBobChat.id });
        await participantRepository.save({ userId: bob.id, chatRoomId: aliceBobChat.id });
        logger.debug(`Added ${alice.username} and ${bob.username} to ${aliceBobChat.name}`);


        // Private Chat: Charlie & Diana
        let charlieDianaChat = new ChatRoom();
        charlieDianaChat.id = uuidv4();
        charlieDianaChat.name = `${charlie.username} & ${diana.username}`;
        charlieDianaChat.type = 'private';
        charlieDianaChat = await chatRoomRepository.save(charlieDianaChat);
        logger.debug(`Created private chat: ${charlieDianaChat.name}`);

        await participantRepository.save({ userId: charlie.id, chatRoomId: charlieDianaChat.id });
        await participantRepository.save({ userId: diana.id, chatRoomId: charlieDianaChat.id });
        logger.debug(`Added ${charlie.username} and ${diana.username} to ${charlieDianaChat.name}`);

        logger.info('Database seeding complete!');

    } catch (error) {
        logger.error('Error during database seeding:', error);
        process.exit(1); // Exit with error code
    } finally {
        await AppDataSource.destroy();
        logger.info('Data Source closed.');
    }
}

// Check if this script is run directly
if (require.main === module) {
    seedDatabase();
}

export { seedDatabase, seedUsers };