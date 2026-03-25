import { AppDataSource } from '../config/data-source';
import { Repository, In, IsNull } from 'typeorm';
import { ChatRoom, ChatRoomType } from '../database/entities/ChatRoom';
import { ChatRoomParticipant } from '../database/entities/ChatRoomParticipant';
import { User } from '../database/entities/User';
import { Message } from '../database/entities/Message';
import { CustomError } from '../middleware/errorHandler';
import { validate } from 'class-validator';
import logger from '../config/logger';

interface CreateChatRoomPayload {
    name?: string;
    type: ChatRoomType;
    participantIds: string[]; // IDs of users to add to the room
    creatorId: string; // The ID of the user creating the room
}

class ChatRoomService {
    private chatRoomRepository: Repository<ChatRoom>;
    private participantRepository: Repository<ChatRoomParticipant>;
    private userRepository: Repository<User>;
    private messageRepository: Repository<Message>;

    constructor() {
        this.chatRoomRepository = AppDataSource.getRepository(ChatRoom);
        this.participantRepository = AppDataSource.getRepository(ChatRoomParticipant);
        this.userRepository = AppDataSource.getRepository(User);
        this.messageRepository = AppDataSource.getRepository(Message);
    }

    async createChatRoom(payload: CreateChatRoomPayload): Promise<ChatRoom> {
        const { name, type, participantIds, creatorId } = payload;

        if (!participantIds || participantIds.length === 0) {
            throw new CustomError('Participant IDs are required.', 400, 'PARTICIPANTS_REQUIRED');
        }

        const allUserIds = Array.from(new Set([...participantIds, creatorId]));

        if (allUserIds.length !== participantIds.length + (participantIds.includes(creatorId) ? 0 : 1)) {
            // This check might be redundant if Set handles duplicates effectively, but ensures no issues
            throw new CustomError('Duplicate participant IDs detected.', 400, 'DUPLICATE_PARTICIPANTS');
        }

        if (type === 'private' && allUserIds.length !== 2) {
            throw new CustomError('Private chats must have exactly two participants.', 400, 'INVALID_PRIVATE_CHAT_PARTICIPANTS');
        }

        // Check if all participants exist
        const users = await this.userRepository.findBy({ id: In(allUserIds) });
        if (users.length !== allUserIds.length) {
            const foundIds = users.map(u => u.id);
            const missingIds = allUserIds.filter(id => !foundIds.includes(id));
            throw new CustomError(`One or more participant IDs not found: ${missingIds.join(', ')}`, 404, 'USER_NOT_FOUND');
        }

        // For private chats, check if a chat room between these two specific users already exists
        if (type === 'private') {
            const [user1Id, user2Id] = allUserIds.sort(); // Consistent order for private chat check
            const existingPrivateChat = await this.chatRoomRepository
                .createQueryBuilder('room')
                .innerJoin('room.participants', 'p1', 'p1.chatRoomId = room.id AND p1.userId = :user1Id', { user1Id })
                .innerJoin('room.participants', 'p2', 'p2.chatRoomId = room.id AND p2.userId = :user2Id', { user2Id })
                .where('room.type = :type', { type: 'private' })
                .andWhere('room.id IN (SELECT chatRoomId FROM chat_room_participants GROUP BY chatRoomId HAVING COUNT(DISTINCT userId) = 2)')
                .getOne();

            if (existingPrivateChat) {
                logger.info(`Existing private chat found between ${user1Id} and ${user2Id}. Returning existing room.`);
                return this.getChatRoomById(existingPrivateChat.id, creatorId); // Fetch and return the existing room with full details
            }
        }

        let chatRoom = new ChatRoom();
        chatRoom.name = name || null; // Name is optional for private chats
        chatRoom.type = type;

        const errors = await validate(chatRoom, { groups: [type === 'group' ? 'group_chat' : ''] });
        if (errors.length > 0) {
            const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
            throw new CustomError('Validation failed.', 400, 'VALIDATION_FAILED', errorMessages);
        }

        await AppDataSource.transaction(async transactionalEntityManager => {
            chatRoom = await transactionalEntityManager.save(ChatRoom, chatRoom);

            const participantEntities = allUserIds.map(userId => {
                const participant = new ChatRoomParticipant();
                participant.userId = userId;
                participant.chatRoomId = chatRoom.id;
                return participant;
            });
            await transactionalEntityManager.save(ChatRoomParticipant, participantEntities);
        });

        logger.info(`Chat room created: ${chatRoom.id} (type: ${chatRoom.type}, name: ${chatRoom.name || 'N/A'}) by ${creatorId}`);
        return this.getChatRoomById(chatRoom.id, creatorId); // Return the newly created room with full participant details
    }

    async getChatRoomsForUser(userId: string): Promise<ChatRoom[]> {
        // Fetch chat rooms the user is a part of, including participants and last message
        const chatRooms = await this.chatRoomRepository
            .createQueryBuilder('room')
            .innerJoin('room.participants', 'participant', 'participant.chatRoomId = room.id AND participant.userId = :userId', { userId })
            .leftJoinAndSelect('room.participants', 'allParticipants')
            .leftJoinAndSelect('allParticipants.user', 'participantUser', 'participantUser.id != :userId', { userId }) // Exclude current user from participant list
            .leftJoinAndSelect('room.messages', 'lastMessage', 'lastMessage.createdAt = (SELECT MAX(m2.createdAt) FROM messages m2 WHERE m2.chatRoomId = room.id)')
            .leftJoinAndSelect('lastMessage.sender', 'lastMessageSender')
            .orderBy('lastMessage.createdAt', 'DESC', 'NULLS LAST')
            .addOrderBy('room.createdAt', 'DESC')
            .getMany();

        // Process rooms to populate `unreadCount` and correctly format private chat names
        const formattedChatRooms = await Promise.all(chatRooms.map(async room => {
            const unreadCount = await this.messageRepository
                .createQueryBuilder('message')
                .leftJoin('message.readBy', 'reader')
                .where('message.chatRoomId = :roomId', { roomId: room.id })
                .andWhere('message.senderId != :userId', { userId }) // Messages not sent by current user
                .andWhere('(reader.id IS NULL OR reader.id != :userId)', { userId }) // Not read by current user
                .getCount();

            let roomName = room.name;
            if (room.type === 'private') {
                const otherParticipant = room.participants.find(p => p.userId !== userId);
                if (otherParticipant && otherParticipant.user) {
                    roomName = otherParticipant.user.username; // Use other participant's name for private chats
                } else {
                    roomName = 'Private Chat'; // Fallback
                }
            }

            const participants = room.participants.map(p => ({
                id: p.user?.id,
                username: p.user?.username,
            })).filter(p => p.id && p.username); // Filter out null/undefined

            const lastMessage = room.messages?.[0] ? {
                id: room.messages[0].id,
                chatRoomId: room.messages[0].chatRoomId,
                senderId: room.messages[0].senderId,
                senderUsername: room.messages[0].sender?.username || 'Unknown',
                content: room.messages[0].content,
                createdAt: room.messages[0].createdAt.toISOString(),
                isRead: room.messages[0].readBy?.some(reader => reader.id === userId) || false,
                readBy: room.messages[0].readBy?.map(reader => reader.id) || [],
            } : undefined;


            return {
                id: room.id,
                name: roomName,
                type: room.type,
                createdAt: room.createdAt,
                updatedAt: room.updatedAt,
                participants: participants,
                lastMessage: lastMessage,
                unreadCount: unreadCount,
            };
        }));
        logger.info(`Fetched ${formattedChatRooms.length} chat rooms for user ${userId}`);
        return formattedChatRooms as any[]; // Cast to any to fit the desired simplified structure for frontend
    }

    async getChatRoomById(roomId: string, userId: string): Promise<ChatRoom> {
        const chatRoom = await this.chatRoomRepository
            .createQueryBuilder('room')
            .leftJoinAndSelect('room.participants', 'participant')
            .leftJoinAndSelect('participant.user', 'user')
            .where('room.id = :roomId', { roomId })
            .andWhere('participant.userId = :userId', { userId }) // Ensure the requesting user is a participant
            .getOne();

        if (!chatRoom) {
            throw new CustomError('Chat room not found or you are not a participant.', 404, 'CHAT_ROOM_NOT_FOUND');
        }

        // Apply private chat naming logic if needed
        if (chatRoom.type === 'private') {
            const otherParticipant = chatRoom.participants.find(p => p.userId !== userId);
            if (otherParticipant && otherParticipant.user) {
                chatRoom.name = otherParticipant.user.username;
            } else {
                chatRoom.name = 'Private Chat'; // Fallback
            }
        }
        logger.debug(`Fetched chat room ${roomId} for user ${userId}`);
        return chatRoom;
    }

    async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
        const participant = await this.participantRepository.findOne({
            where: { userId, chatRoomId: roomId },
        });
        return !!participant;
    }

    async addParticipantToRoom(roomId: string, userIdToAdd: string, requesterId: string): Promise<ChatRoom> {
        const chatRoom = await this.getChatRoomById(roomId, requesterId); // Ensure requester is in room
        if (!chatRoom) {
            throw new CustomError('Chat room not found or requester not a participant.', 404, 'CHAT_ROOM_NOT_FOUND');
        }

        if (chatRoom.type === 'private') {
            throw new CustomError('Cannot add participants to a private chat.', 400, 'CANNOT_ADD_TO_PRIVATE_CHAT');
        }

        const userToAdd = await this.userRepository.findOneBy({ id: userIdToAdd });
        if (!userToAdd) {
            throw new CustomError('User to add not found.', 404, 'USER_TO_ADD_NOT_FOUND');
        }

        const existingParticipant = await this.participantRepository.findOne({
            where: { userId: userIdToAdd, chatRoomId: roomId },
        });

        if (existingParticipant) {
            throw new CustomError('User is already a participant in this room.', 409, 'USER_ALREADY_IN_ROOM');
        }

        const newParticipant = new ChatRoomParticipant();
        newParticipant.userId = userIdToAdd;
        newParticipant.chatRoomId = roomId;
        await this.participantRepository.save(newParticipant);

        logger.info(`User ${userIdToAdd} added to chat room ${roomId} by ${requesterId}`);
        return this.getChatRoomById(roomId, requesterId); // Return updated room details
    }

    async removeParticipantFromRoom(roomId: string, userIdToRemove: string, requesterId: string): Promise<void> {
        const chatRoom = await this.getChatRoomById(roomId, requesterId);
        if (!chatRoom) {
            throw new CustomError('Chat room not found or requester not a participant.', 404, 'CHAT_ROOM_NOT_FOUND');
        }

        if (chatRoom.type === 'private') {
            throw new CustomError('Cannot remove participants from a private chat directly. Delete the chat instead.', 400, 'CANNOT_REMOVE_FROM_PRIVATE_CHAT');
        }

        const participantToRemove = await this.participantRepository.findOne({
            where: { userId: userIdToRemove, chatRoomId: roomId },
        });

        if (!participantToRemove) {
            throw new CustomError('User is not a participant in this room.', 404, 'USER_NOT_IN_ROOM');
        }

        // Add logic to prevent removing the last admin or if it's the only user left in the group
        const remainingParticipants = await this.participantRepository.count({ where: { chatRoomId: roomId } });
        if (remainingParticipants <= 1) { // If only one user remains, consider deleting the room or special handling
            logger.warn(`Removing last participant (${userIdToRemove}) from room ${roomId}. Room will become empty.`);
            // Optionally, delete the room if it becomes empty
        }

        await this.participantRepository.remove(participantToRemove);
        logger.info(`User ${userIdToRemove} removed from chat room ${roomId} by ${requesterId}`);
    }

    async deleteChatRoom(roomId: string, requesterId: string): Promise<void> {
        // Ensure requester is a participant and has permission (e.g., creator or admin)
        const chatRoom = await this.getChatRoomById(roomId, requesterId);
        if (!chatRoom) {
            throw new CustomError('Chat room not found or you are not authorized to delete it.', 404, 'CHAT_ROOM_NOT_FOUND_OR_UNAUTHORIZED');
        }

        // For simplicity, allow any participant to delete. In production, check for admin/creator.
        await this.chatRoomRepository.delete(roomId);
        logger.info(`Chat room ${roomId} deleted by ${requesterId}`);
    }
}

export default new ChatRoomService();