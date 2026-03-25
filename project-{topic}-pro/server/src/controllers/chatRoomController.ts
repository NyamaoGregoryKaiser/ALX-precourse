import { Request, Response } from 'express';
import chatRoomService from '../services/chatRoomService';
import messageService from '../services/messageService';
import { CustomError } from '../middleware/errorHandler';
import logger from '../config/logger';

class ChatRoomController {
    async createChatRoom(req: Request, res: Response) {
        const { name, type, participantIds } = req.body;
        const creatorId = req.user?.id;

        if (!creatorId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        if (!type || !['private', 'group'].includes(type)) {
            throw new CustomError('Invalid or missing chat room type.', 400, 'INVALID_ROOM_TYPE');
        }

        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            throw new CustomError('Participant IDs are required.', 400, 'MISSING_PARTICIPANT_IDS');
        }

        const newChatRoom = await chatRoomService.createChatRoom({ name, type, participantIds, creatorId });

        res.status(201).json({
            message: 'Chat room created successfully',
            chatRoom: {
                id: newChatRoom.id,
                name: newChatRoom.name,
                type: newChatRoom.type,
                // Add participants here if you want to return them
                participants: newChatRoom.participants.map((p: any) => ({
                    id: p.user.id,
                    username: p.user.username,
                })),
            },
        });
        logger.http(`Chat room created: ${newChatRoom.id} by ${creatorId}`);
    }

    async getUserChatRooms(req: Request, res: Response) {
        const userId = req.user?.id;

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        const chatRooms = await chatRoomService.getChatRoomsForUser(userId);
        res.status(200).json(chatRooms);
        logger.debug(`User ${userId} fetched ${chatRooms.length} chat rooms.`);
    }

    async getChatRoomDetails(req: Request, res: Response) {
        const { roomId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        const chatRoom = await chatRoomService.getChatRoomById(roomId, userId);
        res.status(200).json({
            id: chatRoom.id,
            name: chatRoom.name,
            type: chatRoom.type,
            createdAt: chatRoom.createdAt,
            updatedAt: chatRoom.updatedAt,
            participants: chatRoom.participants.map((p: any) => ({
                id: p.user.id,
                username: p.user.username,
                isOnline: p.user.isOnline, // Include online status
            })),
        });
        logger.debug(`User ${userId} fetched details for chat room ${roomId}.`);
    }

    async getChatRoomMessages(req: Request, res: Response) {
        const { roomId } = req.params;
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit as string || '50', 10);
        const offset = parseInt(req.query.offset as string || '0', 10);

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        const messages = await messageService.getMessagesInChatRoom(roomId, userId, limit, offset);

        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            chatRoomId: msg.chatRoomId,
            senderId: msg.senderId,
            senderUsername: msg.sender?.username || 'Unknown',
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
            isRead: msg.readBy?.some(reader => reader.id === userId) || false,
            readBy: msg.readBy?.map(reader => reader.id) || [],
        }));
        res.status(200).json(formattedMessages);
        logger.debug(`User ${userId} fetched ${messages.length} messages for room ${roomId}.`);
    }

    async addParticipant(req: Request, res: Response) {
        const { roomId } = req.params;
        const { userIdToAdd } = req.body;
        const requesterId = req.user?.id;

        if (!requesterId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }
        if (!userIdToAdd) {
            throw new CustomError('User ID to add is required.', 400, 'MISSING_USER_ID_TO_ADD');
        }

        const updatedRoom = await chatRoomService.addParticipantToRoom(roomId, userIdToAdd, requesterId);

        res.status(200).json({
            message: `User ${userIdToAdd} added to chat room ${roomId}`,
            chatRoom: {
                id: updatedRoom.id,
                name: updatedRoom.name,
                type: updatedRoom.type,
                participants: updatedRoom.participants.map((p: any) => ({
                    id: p.user.id,
                    username: p.user.username,
                })),
            },
        });
        logger.http(`User ${userIdToAdd} added to room ${roomId} by ${requesterId}`);
    }

    async removeParticipant(req: Request, res: Response) {
        const { roomId, userIdToRemove } = req.params;
        const requesterId = req.user?.id;

        if (!requesterId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        await chatRoomService.removeParticipantFromRoom(roomId, userIdToRemove, requesterId);

        res.status(200).json({ message: `User ${userIdToRemove} removed from chat room ${roomId}` });
        logger.http(`User ${userIdToRemove} removed from room ${roomId} by ${requesterId}`);
    }

    async deleteChatRoom(req: Request, res: Response) {
        const { roomId } = req.params;
        const requesterId = req.user?.id;

        if (!requesterId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        await chatRoomService.deleteChatRoom(roomId, requesterId);

        res.status(200).json({ message: `Chat room ${roomId} deleted successfully.` });
        logger.http(`Chat room ${roomId} deleted by ${requesterId}`);
    }
}

export default new ChatRoomController();