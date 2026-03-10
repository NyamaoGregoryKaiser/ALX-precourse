import { AppDataSource } from '../../database/data-source';
import { Conversation, ConversationType } from '../../database/entities/Conversation';
import { User } from '../../database/entities/User';
import { ConversationParticipant } from '../../database/entities/ConversationParticipant';
import { CustomError } from '../../utils/error';
import { In } from 'typeorm';

export class ConversationService {
  private conversationRepository = AppDataSource.getRepository(Conversation);
  private userRepository = AppDataSource.getRepository(User);
  private participantRepository = AppDataSource.getRepository(ConversationParticipant);

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .leftJoinAndSelect('conversation.messages', 'message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('participant.userId = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC')
      .addOrderBy('message.sentAt', 'ASC')
      .getMany();
  }

  async createPrivateConversation(userId1: string, userId2: string): Promise<Conversation> {
    if (userId1 === userId2) {
      throw new CustomError('Cannot create a private conversation with yourself', 400);
    }

    const users = await this.userRepository.findBy({ id: In([userId1, userId2]) });
    if (users.length !== 2) {
      throw new CustomError('One or both users not found', 404);
    }

    // Check if a private conversation already exists between these two users
    const existingConversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant1')
      .innerJoin('conversation.participants', 'participant2', 'participant2.id != participant1.id')
      .where('conversation.type = :type', { type: ConversationType.PRIVATE })
      .andWhere('participant1.userId = :userId1', { userId1 })
      .andWhere('participant2.userId = :userId2', { userId2 })
      .getOne();

    if (existingConversation) {
      return existingConversation;
    }

    const newConversation = this.conversationRepository.create({ type: ConversationType.PRIVATE });
    await this.conversationRepository.save(newConversation);

    const participant1 = this.participantRepository.create({ userId: userId1, conversation: newConversation });
    const participant2 = this.participantRepository.create({ userId: userId2, conversation: newConversation });

    await this.participantRepository.save([participant1, participant2]);

    return this.conversationRepository.findOneOrFail({
      where: { id: newConversation.id },
      relations: ['participants', 'participants.user'],
    });
  }

  async createGroupConversation(creatorId: string, participantIds: string[], name: string): Promise<Conversation> {
    if (!name || name.trim() === '') {
      throw new CustomError('Group name is required', 400);
    }
    if (!participantIds.includes(creatorId)) {
      participantIds.push(creatorId); // Ensure creator is included
    }
    if (participantIds.length < 2) {
      throw new CustomError('A group chat must have at least two participants', 400);
    }

    const users = await this.userRepository.findBy({ id: In(participantIds) });
    if (users.length !== participantIds.length) {
      throw new CustomError('One or more participants not found', 404);
    }

    const newConversation = this.conversationRepository.create({
      type: ConversationType.GROUP,
      name,
    });
    await this.conversationRepository.save(newConversation);

    const participants = participantIds.map(userId =>
      this.participantRepository.create({ userId, conversation: newConversation }),
    );
    await this.participantRepository.save(participants);

    return this.conversationRepository.findOneOrFail({
      where: { id: newConversation.id },
      relations: ['participants', 'participants.user'],
    });
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .leftJoinAndSelect('conversation.messages', 'message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('participant.userId = :userId', { userId }) // Ensure the current user is a participant
      .orderBy('message.sentAt', 'ASC')
      .getOne();

    if (!conversation) {
      throw new CustomError('Conversation not found or you are not a participant', 404);
    }
    return conversation;
  }

  async addParticipantToConversation(conversationId: string, newParticipantId: string, currentUserId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });

    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
    if (conversation.type === ConversationType.PRIVATE) {
      throw new CustomError('Cannot add participants to a private conversation', 400);
    }

    const isCurrentUserParticipant = conversation.participants.some(p => p.userId === currentUserId);
    if (!isCurrentUserParticipant) {
      throw new CustomError('You are not a participant of this conversation', 403);
    }

    const isNewParticipantAlreadyIn = conversation.participants.some(p => p.userId === newParticipantId);
    if (isNewParticipantAlreadyIn) {
      throw new CustomError('User is already a participant', 409);
    }

    const newParticipantUser = await this.userRepository.findOneBy({ id: newParticipantId });
    if (!newParticipantUser) {
      throw new CustomError('New participant user not found', 404);
    }

    const participant = this.participantRepository.create({
      userId: newParticipantId,
      conversation: conversation,
    });
    await this.participantRepository.save(participant);

    return this.conversationRepository.findOneOrFail({
      where: { id: conversation.id },
      relations: ['participants', 'participants.user'],
    });
  }

  async removeParticipantFromConversation(conversationId: string, participantIdToRemove: string, currentUserId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
    if (conversation.type === ConversationType.PRIVATE) {
      throw new CustomError('Cannot remove participants from a private conversation', 400);
    }

    const isCurrentUserParticipant = conversation.participants.some(p => p.userId === currentUserId);
    if (!isCurrentUserParticipant) {
      throw new CustomError('You are not a participant of this conversation', 403);
    }

    const participantToRemove = await this.participantRepository.findOne({
      where: { conversationId, userId: participantIdToRemove },
    });

    if (!participantToRemove) {
      throw new CustomError('Participant not found in this conversation', 404);
    }

    if (conversation.participants.length <= 2) {
      throw new CustomError('Cannot remove participant: a group must have at least two participants. Consider deleting the group instead.', 400);
    }

    await this.participantRepository.remove(participantToRemove);

    return this.conversationRepository.findOneOrFail({
      where: { id: conversation.id },
      relations: ['participants', 'participants.user'],
    });
  }

  async deleteConversation(conversationId: string, currentUserId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    const isCurrentUserParticipant = conversation.participants.some(p => p.userId === currentUserId);
    if (!isCurrentUserParticipant) {
      throw new CustomError('You are not a participant of this conversation', 403);
    }

    // For simplicity, any participant can delete their view of a conversation
    // For groups, usually only admins can delete or leave.
    // Here, we'll remove all participants and then delete the conversation if no participants left
    await this.conversationRepository.remove(conversation);
    // Note: TypeORM's cascading deletes on relations might handle participant and message deletion if configured.
    // Ensure onDelete: 'CASCADE' is set on foreign keys in entities.
  }
}