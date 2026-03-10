import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ConversationParticipant } from './ConversationParticipant';
import { Message } from './Message';

export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ConversationType, default: ConversationType.PRIVATE })
  type!: ConversationType;

  @Column({ nullable: true })
  name?: string; // For group chats

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => ConversationParticipant, participant => participant.conversation)
  participants!: ConversationParticipant[];

  @OneToMany(() => Message, message => message.conversation)
  messages!: Message[];
}