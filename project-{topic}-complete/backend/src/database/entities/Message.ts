```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { Room } from './Room';

@Entity('messages')
@Index(['roomId', 'createdAt']) // Index for efficient retrieval of messages by room and time
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  content!: string;

  @Column({ type: 'uuid' })
  senderId!: string;

  @Column()
  senderName!: string; // Denormalized for quick access without join

  @Column({ type: 'uuid' })
  roomId!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.messages, { onDelete: 'CASCADE' })
  sender!: User;

  @ManyToOne(() => Room, (room) => room.messages, { onDelete: 'CASCADE' })
  room!: Room;
}
```