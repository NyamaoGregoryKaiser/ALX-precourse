```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

@Entity('tasks')
export class Task {
  @ApiProperty({ description: 'Unique identifier of the task' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Title of the task', example: 'Implement user login' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: 'Description of the task', nullable: true, example: 'Develop the backend and frontend for user authentication.' })
  @Column('text', { nullable: true })
  description: string;

  @ApiProperty({ description: 'Current status of the task', enum: TaskStatus, default: TaskStatus.OPEN })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.OPEN })
  status: TaskStatus;

  @ApiProperty({ description: 'Priority of the task', enum: TaskPriority, default: TaskPriority.MEDIUM })
  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ApiProperty({ description: 'Due date of the task', type: String, format: 'date-time', nullable: true, example: '2024-03-15T10:00:00Z' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date;

  @ApiProperty({ description: 'Timestamp when the task was created' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the task was last updated' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @ApiProperty({ type: () => Project, description: 'The project this task belongs to' })
  @ManyToOne(() => Project, project => project.tasks, { onDelete: 'CASCADE' })
  project: Project;

  @ApiProperty({ type: () => User, description: 'The user who created this task' })
  @ManyToOne(() => User, user => user.id, { eager: true }) // Eager load creator
  creator: User;

  @ApiProperty({ type: () => User, description: 'The user assigned to this task', nullable: true })
  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true, eager: true }) // Eager load assignee
  assignee: User;

  @ApiProperty({ type: () => [Comment], description: 'List of comments on this task' })
  @OneToMany(() => Comment, comment => comment.task, { cascade: true })
  comments: Comment[];
}
```