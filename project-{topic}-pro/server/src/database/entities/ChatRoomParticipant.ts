import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { IsUUID } from 'class-validator';
import { User } from './User';
import { ChatRoom } from './ChatRoom';

@Entity('chat_room_participants')
@Unique(['userId', 'chatRoomId']) // Ensure a user can only be a participant once per room
export class ChatRoomParticipant {
    @PrimaryGeneratedColumn('uuid')
    @IsUUID()
    id: string;

    @Column({ type: 'uuid' })
    @IsUUID()
    userId: string;

    @Column({ type: 'uuid' })
    @IsUUID()
    chatRoomId: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    joinedAt: Date;

    // Relations
    @ManyToOne(() => User, user => user.chatRoomParticipants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => ChatRoom, chatRoom => chatRoom.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatRoomId' })
    chatRoom: ChatRoom;
}