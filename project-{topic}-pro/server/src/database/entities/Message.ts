import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { IsNotEmpty, IsUUID, Length } from 'class-validator';
import { User } from './User';
import { ChatRoom } from './ChatRoom';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    @IsUUID()
    id: string;

    @Column({ type: 'uuid' })
    @IsUUID()
    chatRoomId: string;

    @Column({ type: 'uuid' })
    @IsUUID()
    senderId: string;

    @Column({ type: 'text' })
    @IsNotEmpty()
    @Length(1, 1000)
    content: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date | null; // Indicates if the message has been read by *at least one* recipient

    // Relations
    @ManyToOne(() => ChatRoom, chatRoom => chatRoom.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatRoomId' })
    chatRoom: ChatRoom;

    @ManyToOne(() => User, user => user.messages, { onDelete: 'SET NULL' }) // If sender is deleted, message sender becomes null
    @JoinColumn({ name: 'senderId' })
    sender: User;

    // Many-to-many relationship for who has read the message (for group chats)
    @ManyToMany(() => User, { cascade: true })
    @JoinTable({
        name: 'message_read_by_users',
        joinColumn: {
            name: 'messageId',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'userId',
            referencedColumnName: 'id',
        },
    })
    readBy: User[];
}