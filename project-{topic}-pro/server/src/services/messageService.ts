import { AppDataSource } from '../config/data-source';
import { Repository } from 'typeorm';
import { Message } from '../database/entities/Message';
import { User } from '../database/entities/User';
import { CustomError } from '../middleware/errorHandler';
import { ChatRoomParticipant } from '../database/entities/ChatRoomParticipant';
import { validate } from 'class-validator';
import logger from '../config/logger';

class MessageService {
    private messageRepository: Repository<Message>;
    private chatRoomParticipantRepository: Repository<ChatRoomParticipant>;
    private userRepository: Repository<User>;

    constructor() {
        this.messageRepository = AppDataSource.getRepository(Message);
        this.chatRoomParticipantRepository = AppDataSource.getRepository(ChatRoomParticipant);
        this.userRepository = AppDataSource.getRepository(User);
    }

    async getMessagesInChatRoom(chatRoomId: string, userId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
        // First, check if the user is a participant of the chat room
        const participant = await this.chatRoomParticipantRepository.findOne({
            where: { chatRoomId, userId },
        });

        if (!participant) {
            throw new CustomError('User is not a participant of this chat room.', 403, 'FORBIDDEN_CHAT_ROOM');
        }

        const messages = await this.messageRepository
            .find({
                where: { chatRoomId },
                relations: ['sender', 'readBy'], // Load sender details and who has read it
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
            });

        // Ensure messages are returned in chronological order for UI
        const sortedMessages = messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        logger.debug(`Fetched ${sortedMessages.length} messages for chat room ${chatRoomId} by user ${userId}`);
        return sortedMessages;
    }

    async createMessage(chatRoomId: string, senderId: string, content: string): Promise<Message> {
        // Check if sender is a participant of the chat room
        const participant = await this.chatRoomParticipantRepository.findOne({
            where: { chatRoomId, userId: senderId },
        });

        if (!participant) {
            throw new CustomError('Sender is not a participant of this chat room.', 403, 'FORBIDDEN_CHAT_ROOM');
        }

        const message = new Message();
        message.chatRoomId = chatRoomId;
        message.senderId = senderId;
        message.content = content;

        const errors = await validate(message);
        if (errors.length > 0) {
            const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
            throw new CustomError('Message validation failed.', 400, 'VALIDATION_FAILED', errorMessages);
        }

        // Load sender relation for the socket emission
        message.sender = await this.userRepository.findOneBy({ id: senderId }) as User; // Assert existence based on prior check

        const savedMessage = await this.messageRepository.save(message);
        logger.info(`Message created in room ${chatRoomId} by ${senderId}: ${content.substring(0, 50)}...`);
        return savedMessage;
    }

    async markMessageAsRead(messageId: string, userId: string): Promise<void> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['readBy', 'chatRoom'], // Load existing readers and chatroom for participant check
        });

        if (!message) {
            throw new CustomError('Message not found.', 404, 'MESSAGE_NOT_FOUND');
        }

        // Ensure user is a participant of the chat room
        const isParticipant = await this.chatRoomParticipantRepository.findOne({
            where: { chatRoomId: message.chatRoomId, userId },
        });

        if (!isParticipant) {
            throw new CustomError('User is not a participant of this chat room.', 403, 'FORBIDDEN_CHAT_ROOM');
        }

        // Ensure the user hasn't already read this message
        if (message.readBy?.some(reader => reader.id === userId)) {
            logger.debug(`Message ${messageId} already marked as read by ${userId}`);
            return; // Already read, no action needed
        }

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new CustomError('Reading user not found.', 404, 'USER_NOT_FOUND');
        }

        message.readBy = message.readBy || [];
        message.readBy.push(user);
        message.readAt = new Date(); // Update readAt when the first person reads it (or last, depending on logic)

        await this.messageRepository.save(message);
        logger.info(`Message ${messageId} marked as read by user ${userId}`);
    }
}

export default new MessageService();