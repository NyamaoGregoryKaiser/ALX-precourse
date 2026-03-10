import { AppDataSource } from '../../database/data-source';
import { Message } from '../../database/entities/Message';
import { Conversation } from '../../database/entities/Conversation';
import { User } from '../../database/entities/User';
import { CustomError } from '../../utils/error';

export class MessageService {
  private messageRepository = AppDataSource.getRepository(Message);
  private conversationRepository = AppDataSource.getRepository(Conversation);
  private userRepository = AppDataSource.getRepository(User);

  async getMessagesInConversation(conversationId: string, userId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    // Ensure the user is a participant of the conversation
    const isParticipant = await AppDataSource.getRepository(Conversation)
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('participant.userId = :userId', { userId })
      .getOne();

    if (!isParticipant) {
      throw new CustomError('You are not authorized to view messages in this conversation', 403);
    }

    return this.messageRepository.find({
      where: { conversationId },
      relations: ['sender'],
      order: { sentAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    const sender = await this.userRepository.findOneBy({ id: senderId });
    if (!sender) {
      throw new CustomError('Sender not found', 404);
    }

    const isSenderParticipant = conversation.participants.some(p => p.userId === senderId);
    if (!isSenderParticipant) {
      throw new CustomError('You are not a participant of this conversation', 403);
    }

    const newMessage = this.messageRepository.create({
      conversation,
      sender,
      content,
    });

    await this.messageRepository.save(newMessage);

    // Update conversation updatedAt to bring it to the top of conversation list
    conversation.updatedAt = new Date();
    await this.conversationRepository.save(conversation);

    return this.messageRepository.findOneOrFail({
      where: { id: newMessage.id },
      relations: ['sender'],
    });
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation', 'conversation.participants'],
    });

    if (!message) {
      throw new CustomError('Message not found', 404);
    }

    const isUserParticipant = message.conversation.participants.some(p => p.userId === userId);
    if (!isUserParticipant) {
      throw new CustomError('You are not authorized to mark this message as read', 403);
    }

    if (!message.readAt) {
      message.readAt = new Date();
      await this.messageRepository.save(message);
    }

    return message;
  }
}