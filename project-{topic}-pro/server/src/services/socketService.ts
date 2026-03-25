import { Server as SocketIOServer } from 'socket.io';
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { ChatRoomParticipant } from '../database/entities/ChatRoomParticipant';
import messageService from './messageService';
import chatRoomService from './chatRoomService';
import userService from './userService';
import logger from '../config/logger';
import {
    AuthenticatedSocket,
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
    MessagePayload,
    ChatRoomPayload
} from '../types/socket.d';
import redisClient from '../config/redis'; // For managing user sessions/presence in a distributed setup
import { CustomError } from '../middleware/errorHandler';

// Map to store user's active sockets (for managing multiple devices/tabs per user)
// Key: userId, Value: Set of socket.id
const userSockets = new Map<string, Set<string>>();

class SocketService {
    public io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

    constructor() {
        // `io` is initialized in `server.ts` once the HTTP server is ready
        this.io = null as any; // Temporary null, will be assigned
    }

    public initializeSocketIO(httpServer: any) {
        this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingInterval: 10000,
            pingTimeout: 5000,
        });

        // Middleware to authenticate socket connections
        this.io.use(async (socket: AuthenticatedSocket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                logger.warn('Socket authentication failed: Token missing.');
                return next(new CustomError('Authentication token missing.', 401, 'SOCKET_AUTH_MISSING'));
            }

            try {
                const secret = process.env.JWT_SECRET;
                if (!secret) {
                    logger.error('JWT_SECRET is not defined for Socket.IO.');
                    return next(new CustomError('Server configuration error.', 500, 'SERVER_ERROR'));
                }
                const decoded: any = await new Promise((resolve, reject) => {
                    require('jsonwebtoken').verify(token, secret, (err: any, decoded: any) => {
                        if (err) return reject(err);
                        resolve(decoded);
                    });
                });

                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneBy({ id: decoded.userId });

                if (!user) {
                    logger.warn(`Socket authentication failed: User not found for ID ${decoded.userId}.`);
                    return next(new CustomError('User not found.', 401, 'SOCKET_USER_NOT_FOUND'));
                }

                socket.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                };
                socket.data.userId = user.id;
                socket.data.username = user.username;
                socket.data.roomIds = []; // Initialize room IDs for this socket

                logger.info(`Socket authenticated: User ${user.username} (${user.id}) connected.`);
                next();
            } catch (error: any) {
                logger.error(`Socket authentication error: ${error.message}`, { error });
                if (error instanceof require('jsonwebtoken').TokenExpiredError) {
                    return next(new CustomError('Authentication token expired.', 401, 'SOCKET_AUTH_TOKEN_EXPIRED'));
                } else if (error instanceof require('jsonwebtoken').JsonWebTokenError) {
                    return next(new CustomError('Invalid authentication token.', 401, 'SOCKET_AUTH_TOKEN_INVALID'));
                }
                next(new CustomError('Socket authentication failed.', 401, 'SOCKET_AUTH_FAILED'));
            }
        });

        this.io.on('connection', this.handleConnection);
        logger.info('Socket.IO initialized and listening for connections.');
    }

    private handleConnection = async (socket: AuthenticatedSocket) => {
        logger.info(`User ${socket.user.username} connected with socket ID: ${socket.id}`);

        // Update user online status
        await userService.updateUserOnlineStatus(socket.user.id, true);

        // Store active socket for the user
        if (!userSockets.has(socket.user.id)) {
            userSockets.set(socket.user.id, new Set());
        }
        userSockets.get(socket.user.id)?.add(socket.id);

        // For distributed systems, use Redis to manage presence/room subscriptions
        // await redisClient.sadd(`user:${socket.user.id}:sockets`, socket.id);
        // await redisClient.publish('presence', JSON.stringify({ userId: socket.user.id, status: 'online' }));

        socket.on('join_room', async ({ roomId }) => {
            logger.debug(`User ${socket.user.username} attempting to join room ${roomId}`);
            try {
                const isParticipant = await chatRoomService.isUserInRoom(socket.user.id, roomId);
                if (!isParticipant) {
                    throw new CustomError('User is not a participant of this chat room.', 403, 'ROOM_JOIN_FORBIDDEN');
                }

                if (socket.data.roomIds.includes(roomId)) {
                    logger.debug(`User ${socket.user.username} already in room ${roomId} on this socket.`);
                    return; // Already joined
                }

                socket.join(roomId);
                socket.data.roomIds.push(roomId);
                logger.info(`User ${socket.user.username} (${socket.user.id}) joined room ${roomId}`);

                this.io.to(roomId).emit('user_joined_room', {
                    roomId,
                    userId: socket.user.id,
                    username: socket.user.username,
                });

                // Update room information for other clients if a participant list changes
                const updatedRoom = await chatRoomService.getChatRoomById(roomId, socket.user.id); // Get updated room data
                if (updatedRoom) {
                     // Notify all clients in the room about the updated room
                    this.io.to(roomId).emit('room_updated', this.mapChatRoomToPayload(updatedRoom, socket.user.id));
                }

            } catch (error: any) {
                logger.error(`Error joining room ${roomId} for user ${socket.user.username}: ${error.message}`);
                socket.emit('error', error.message);
            }
        });

        socket.on('leave_room', async ({ roomId }) => {
            try {
                // No explicit leave_room API call, just detach socket from room
                socket.leave(roomId);
                socket.data.roomIds = socket.data.roomIds.filter(id => id !== roomId);
                logger.info(`User ${socket.user.username} (${socket.user.id}) left room ${roomId}`);

                this.io.to(roomId).emit('user_left_room', {
                    roomId,
                    userId: socket.user.id,
                    username: socket.user.username,
                });
            } catch (error: any) {
                logger.error(`Error leaving room ${roomId} for user ${socket.user.username}: ${error.message}`);
                socket.emit('error', error.message);
            }
        });

        socket.on('send_message', async ({ chatRoomId, content }) => {
            try {
                const message = await messageService.createMessage(chatRoomId, socket.user.id, content);
                logger.debug(`Broadcasting message ${message.id} to room ${chatRoomId}`);

                const messagePayload: MessagePayload = {
                    id: message.id,
                    chatRoomId: message.chatRoomId,
                    senderId: message.senderId,
                    senderUsername: message.sender.username,
                    content: message.content,
                    createdAt: message.createdAt.toISOString(),
                    isRead: false, // Will be updated by recipients
                    readBy: [],
                };
                this.io.to(chatRoomId).emit('receive_message', messagePayload);
            } catch (error: any) {
                logger.error(`Error sending message in room ${chatRoomId} by user ${socket.user.username}: ${error.message}`, { error });
                socket.emit('error', error.message);
            }
        });

        socket.on('typing_start', ({ roomId }) => {
            // Broadcast to all clients in the room EXCEPT the sender
            socket.to(roomId).emit('typing_start', {
                roomId,
                userId: socket.user.id,
                username: socket.user.username,
            });
            logger.debug(`User ${socket.user.username} started typing in room ${roomId}`);
        });

        socket.on('typing_stop', ({ roomId }) => {
            // Broadcast to all clients in the room EXCEPT the sender
            socket.to(roomId).emit('typing_stop', {
                roomId,
                userId: socket.user.id,
                username: socket.user.username,
            });
            logger.debug(`User ${socket.user.username} stopped typing in room ${roomId}`);
        });

        socket.on('mark_message_read', async ({ messageId, roomId }) => {
            try {
                await messageService.markMessageAsRead(messageId, socket.user.id);
                // Broadcast to all clients in the room (including sender) that the message was read
                this.io.to(roomId).emit('message_read', {
                    messageId,
                    readerId: socket.user.id,
                    roomId,
                });
                logger.debug(`Message ${messageId} marked as read by ${socket.user.username} in room ${roomId}`);
            } catch (error: any) {
                logger.error(`Error marking message ${messageId} as read by ${socket.user.username}: ${error.message}`);
                socket.emit('error', error.message);
            }
        });

        socket.on('disconnect', async () => {
            logger.info(`User ${socket.user.username} disconnected with socket ID: ${socket.id}`);

            // Remove socket from user's active sockets
            const sockets = userSockets.get(socket.user.id);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(socket.user.id);
                    // If no other active sockets for this user, mark as offline
                    await userService.updateUserOnlineStatus(socket.user.id, false);
                    logger.info(`User ${socket.user.username} is now offline.`);
                    // await redisClient.publish('presence', JSON.stringify({ userId: socket.user.id, status: 'offline' }));
                }
            }
            // In a distributed system, also remove from Redis set
            // await redisClient.srem(`user:${socket.user.id}:sockets`, socket.id);

            // Notify rooms that user has left (optional, can be inferred by offline status)
            for (const roomId of socket.data.roomIds) {
                this.io.to(roomId).emit('user_left_room', {
                    roomId,
                    userId: socket.user.id,
                    username: socket.user.username,
                });
            }
        });
    };

    // Helper to map ChatRoom entity to SocketPayload format
    private mapChatRoomToPayload(chatRoom: any, currentUserId: string): ChatRoomPayload {
        let roomName = chatRoom.name;
        if (chatRoom.type === 'private') {
            const otherParticipant = chatRoom.participants?.find((p: any) => p.user.id !== currentUserId);
            if (otherParticipant && otherParticipant.user) {
                roomName = otherParticipant.user.username;
            } else {
                roomName = 'Private Chat';
            }
        }

        const participants = chatRoom.participants?.map((p: any) => ({
            id: p.user.id,
            username: p.user.username,
        })) || [];

        return {
            id: chatRoom.id,
            name: roomName,
            type: chatRoom.type,
            participants: participants,
            // lastMessage and unreadCount are typically not updated via this specific event,
            // but can be added if the event is designed to carry full room state.
            // For now, let's keep it minimal as room_updated mainly signals participant changes.
        };
    }
}

export default new SocketService();