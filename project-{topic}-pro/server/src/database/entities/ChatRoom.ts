import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsNotEmpty, IsUUID, Length, IsIn } from 'class-validator';
import { ChatRoomParticipant } from './ChatRoomParticipant';
import { Message } from './Message';

export type ChatRoomType = 'private' | 'group';

@Entity('chat_rooms')
export class ChatRoom {
    @PrimaryGeneratedColumn('uuid')
    @IsUUID()
    id: string;

    @Column({ nullable: true }) // Optional for private chats
    @Length(1, 100, { groups: ['group_chat'] }) // Name required for group chats
    name: string;

    @Column({ type: 'enum', enum: ['private', 'group'] })
    @IsNotEmpty()
    @IsIn(['private', 'group'])
    type: ChatRoomType;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => ChatRoomParticipant, participant => participant.chatRoom)
    participants: ChatRoomParticipant[];

    @OneToMany(() => Message, message => message.chatRoom)
    messages: Message[];
}