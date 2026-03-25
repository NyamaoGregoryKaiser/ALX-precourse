```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Message } from './Message';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  // For simplicity, we'll store active users in a separate structure/cache,
  // not directly in the DB entity itself, as it's volatile state.
  // This column could be used for 'members' if it's a persistent, controlled list.
  // @Column("text", { array: true, default: [] })
  // memberIds!: string[];

  @OneToMany(() => Message, (message) => message.room)
  messages!: Message[];
}
```