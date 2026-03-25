import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/data-source';
import { User } from '../../src/database/entities/User';
import { ChatRoom } from '../../src/database/entities/ChatRoom';
import { ChatRoomParticipant } from '../../src/database/entities/ChatRoomParticipant';
import { Message } from '../../src/database/entities/Message';
import authService from '../../src/services/authService';
import { seedUsers } from '../../src/database/seeds/initialSeed';

let alice: User;
let bob: User;
let charlie: User;
let aliceToken: string;
let bobToken: string;
let charlieToken: string;

let generalChatRoom: ChatRoom;
let aliceBobPrivateChat: ChatRoom;

describe('Chat Room Integration Tests', () => {
    beforeAll(async () => {
        // Assume jest.setup.ts has already initialized DB and seeded basic users.
        // We'll fetch them from the database to ensure we have valid IDs.
        const userRepository = AppDataSource.getRepository(User);
        const chatRoomRepository = AppDataSource.getRepository(ChatRoom);

        alice = (await userRepository.findOneBy({ username: 'alice' }))!;
        bob = (await userRepository.findOneBy({ username: 'bob' }))!;
        charlie = (await userRepository.findOneBy({ username: 'charlie' }))!;

        // Generate tokens for these users
        aliceToken = (await authService.login(alice.email, 'password123')).accessToken;
        bobToken = (await authService.login(bob.email, 'password123')).accessToken;
        charlieToken = (await authService.login(charlie.email, 'password123')).accessToken;

        generalChatRoom = (await chatRoomRepository.findOne({
            where: { name: 'General Discussion', type: 'group' },
            relations: ['participants', 'participants.user']
        }))!;

        // Get the Alice-Bob private chat room
        const aliceBobParticipants = await AppDataSource.getRepository(ChatRoomParticipant).find({
            where: [
                { userId: alice.id },
                { userId: bob.id }
            ],
            relations: ['chatRoom']
        });

        const aliceBobRoomIds = aliceBobParticipants.map(p => p.chatRoomId);
        // Find a room where both Alice and Bob are participants, and it's a private chat
        for (const roomId of aliceBobRoomIds) {
            const room = await chatRoomRepository.findOne({
                where: { id: roomId, type: 'private' },
                relations: ['participants', 'participants.user']
            });
            if (room && room.participants.length === 2 &&
                room.participants.some(p => p.userId === alice.id) &&
                room.participants.some(p => p.userId === bob.id)) {
                aliceBobPrivateChat = room;
                break;
            }
        }
        if (!aliceBobPrivateChat) {
            throw new Error('Failed to find Alice-Bob private chat for testing');
        }
    });

    it('should create a new group chat room', async () => {
        const response = await request(app)
            .post('/api/chat-rooms')
            .set('Authorization', `Bearer ${aliceToken}`)
            .send({
                name: 'Dev Team Chat',
                type: 'group',
                participantIds: [alice.id, bob.id] // Alice is implicitly added by the service logic
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('Chat room created successfully');
        expect(response.body.chatRoom).toHaveProperty('id');
        expect(response.body.chatRoom.name).toBe('Dev Team Chat');
        expect(response.body.chatRoom.type).toBe('group');
        expect(response.body.chatRoom.participants).toHaveLength(2);
        expect(response.body.chatRoom.participants.some((p: any) => p.id === alice.id)).toBe(true);
        expect(response.body.chatRoom.participants.some((p: any) => p.id === bob.id)).toBe(true);
    });

    it('should create a new private chat room or return existing', async () => {
        // Create a private chat between Alice and Charlie
        const response1 = await request(app)
            .post('/api/chat-rooms')
            .set('Authorization', `Bearer ${aliceToken}`)
            .send({
                type: 'private',
                participantIds: [charlie.id] // Alice is implicitly added
            });

        expect(response1.statusCode).toBe(201);
        expect(response1.body.message).toBe('Chat room created successfully');
        expect(response1.body.chatRoom.type).toBe('private');
        expect(response1.body.chatRoom.participants).toHaveLength(2);
        expect(response1.body.chatRoom.participants.some((p: any) => p.id === alice.id)).toBe(true);
        expect(response1.body.chatRoom.participants.some((p: any) => p.id === charlie.id)).toBe(true);

        const newPrivateChatId = response1.body.chatRoom.id;

        // Try to create the same private chat again (should return existing)
        const response2 = await request(app)
            .post('/api/chat-rooms')
            .set('Authorization', `Bearer ${aliceToken}`)
            .send({
                type: 'private',
                participantIds: [charlie.id]
            });

        expect(response2.statusCode).toBe(201); // Still 201 as it's a successful 'creation' or retrieval
        expect(response2.body.chatRoom.id).toBe(newPrivateChatId); // Should return the same room ID
    });

    it('should get chat rooms for a user', async () => {
        const response = await request(app)
            .get('/api/chat-rooms')
            .set('Authorization', `Bearer ${aliceToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2); // General + Alice-Bob private chat + new private chat
        expect(response.body.some((room: any) => room.name === 'General Discussion')).toBe(true);
        expect(response.body.some((room: any) => room.type === 'private' && room.name === bob.username)).toBe(true);
    });

    it('should get messages for a chat room', async () => {
        // First, send a message to general chat
        const messageRepo = AppDataSource.getRepository(Message);
        const msg = new Message();
        msg.chatRoomId = generalChatRoom.id;
        msg.senderId = alice.id;
        msg.content = 'Hello everyone in general chat!';
        await messageRepo.save(msg);

        const response = await request(app)
            .get(`/api/chat-rooms/${generalChatRoom.id}/messages`)
            .set('Authorization', `Bearer ${aliceToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        expect(response.body[0].content).toBe('Hello everyone in general chat!');
        expect(response.body[0].senderUsername).toBe('alice');
    });

    it('should add a participant to a group chat', async () => {
        // Create a new group chat just with Alice
        const chatRoomRepo = AppDataSource.getRepository(ChatRoom);
        let soloChat = new ChatRoom();
        soloChat.name = 'Solo Test Chat';
        soloChat.type = 'group';
        soloChat = await chatRoomRepo.save(soloChat);
        await AppDataSource.getRepository(ChatRoomParticipant).save({ userId: alice.id, chatRoomId: soloChat.id });

        const response = await request(app)
            .post(`/api/chat-rooms/${soloChat.id}/participants`)
            .set('Authorization', `Bearer ${aliceToken}`)
            .send({ userIdToAdd: charlie.id });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain(`User ${charlie.id} added`);
        expect(response.body.chatRoom.participants).toHaveLength(2);
        expect(response.body.chatRoom.participants.some((p: any) => p.id === charlie.id)).toBe(true);
    });

    it('should prevent adding a participant to a private chat', async () => {
        const response = await request(app)
            .post(`/api/chat-rooms/${aliceBobPrivateChat.id}/participants`)
            .set('Authorization', `Bearer ${aliceToken}`)
            .send({ userIdToAdd: charlie.id });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Cannot add participants to a private chat.');
    });

    it('should prevent a non-participant from accessing chat room details', async () => {
        // Charlie tries to access Alice-Bob private chat
        const response = await request(app)
            .get(`/api/chat-rooms/${aliceBobPrivateChat.id}`)
            .set('Authorization', `Bearer ${charlieToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Chat room not found or you are not a participant.');
    });

    it('should delete a group chat room', async () => {
        // Create a temporary group chat for deletion
        const chatRoomRepo = AppDataSource.getRepository(ChatRoom);
        let tempChat = new ChatRoom();
        tempChat.name = 'Temp Chat for Deletion';
        tempChat.type = 'group';
        tempChat = await chatRoomRepo.save(tempChat);
        await AppDataSource.getRepository(ChatRoomParticipant).save({ userId: alice.id, chatRoomId: tempChat.id });

        const response = await request(app)
            .delete(`/api/chat-rooms/${tempChat.id}`)
            .set('Authorization', `Bearer ${aliceToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe(`Chat room ${tempChat.id} deleted successfully.`);

        // Verify it's actually deleted
        const checkResponse = await request(app)
            .get(`/api/chat-rooms/${tempChat.id}`)
            .set('Authorization', `Bearer ${aliceToken}`);
        expect(checkResponse.statusCode).toBe(404);
    });
});