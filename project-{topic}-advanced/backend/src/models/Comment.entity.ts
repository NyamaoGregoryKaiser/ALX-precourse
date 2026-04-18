```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './User.entity';
import { Task } from './Task.entity';

@Entity('comments')
@Index(['taskId', 'createdAt']) // Index for comments ordered by creation date within a task
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => User, user => user.comments, { onDelete: 'CASCADE', eager: true }) // Eager load author
  author!: User;

  @Column({ type: 'uuid' })
  authorId!: string; // Explicit column for author's ID

  @ManyToOne(() => Task, task => task.comments, { onDelete: 'CASCADE' })
  task!: Task;

  @Column({ type: 'uuid' })
  taskId!: string; // Explicit column for task's ID

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
```