```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('notifications')
export class Notification {
  @ApiProperty({ description: 'Unique identifier of the notification' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The user to whom the notification belongs' })
  @ManyToOne(() => User, user => user.notifications, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ description: 'The message content of the notification', example: 'You have been assigned to a new task.' })
  @Column('text')
  message: string;

  @ApiProperty({ description: 'Whether the notification has been read', default: false })
  @Column({ default: false })
  isRead: boolean;

  @ApiProperty({ description: 'Type of entity related to the notification (e.g., task, project)', nullable: true, example: 'task' })
  @Column({ nullable: true })
  entityType: string;

  @ApiProperty({ description: 'ID of the related entity', nullable: true, example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @Column({ type: 'uuid', nullable: true })
  entityId: string;

  @ApiProperty({ description: 'Timestamp when the notification was created' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
```