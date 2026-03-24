```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('comments')
export class Comment {
  @ApiProperty({ description: 'Unique identifier of the comment' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Content of the comment', example: 'Great progress on this task!' })
  @Column('text')
  content: string;

  @ApiProperty({ description: 'Timestamp when the comment was created' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the comment was last updated' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @ApiProperty({ type: () => Task, description: 'The task this comment belongs to' })
  @ManyToOne(() => Task, task => task.comments, { onDelete: 'CASCADE' })
  task: Task;

  @ApiProperty({ type: () => User, description: 'The user who authored this comment' })
  @ManyToOne(() => User, user => user.comments, { eager: true }) // Eager load author
  author: User;
}
```