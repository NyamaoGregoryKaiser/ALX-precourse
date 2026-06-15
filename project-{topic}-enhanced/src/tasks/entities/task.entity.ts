```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { TaskStatus } from '../enum/task-status.enum';
import { TaskPriority } from '../enum/task-priority.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('tasks')
export class Task {
  @ApiProperty({ description: 'Unique identifier of the task', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Title of the task', example: 'Finish project report' })
  @Column({ length: 100, nullable: false })
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the task',
    example: 'Write executive summary, findings, and recommendations.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Current status of the task',
    enum: TaskStatus,
    example: TaskStatus.OPEN,
  })
  @Column({ type: 'varchar', length: 20, default: TaskStatus.OPEN })
  status: TaskStatus;

  @ApiProperty({
    description: 'Priority level of the task',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
  })
  @Column({ type: 'varchar', length: 20, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ApiPropertyOptional({
    description: 'Due date for the task',
    example: '2023-12-31T23:59:59.000Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @ApiProperty({ type: () => User, description: 'The user who owns this task' })
  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  user: User;

  @ApiPropertyOptional({
    type: () => Category,
    description: 'The category this task belongs to',
    nullable: true,
  })
  @ManyToOne(() => Category, (category) => category.tasks, {
    nullable: true,
    onDelete: 'SET NULL', // If category is deleted, categoryId in task becomes NULL
    eager: true, // Eager load category when fetching tasks
  })
  category: Category;

  @ApiProperty({ description: 'Timestamp when the task was created', example: '2023-10-27T10:00:00.000Z' })
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the task was last updated', example: '2023-10-27T10:30:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```