```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './User.entity';
import { Project } from './Project.entity';
import { Comment } from './Comment.entity';

export type TaskStatus = 'to-do' | 'in-progress' | 'under-review' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('tasks')
@Index(['projectId', 'status']) // Index for common filtering
@Index(['assigneeId', 'status']) // Index for user-specific tasks
@Index(['dueDate']) // Index for tasks ordered by due date
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 500 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['to-do', 'in-progress', 'under-review', 'completed', 'blocked'], default: 'to-do' })
  status!: TaskStatus;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority!: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @ManyToOne(() => Project, project => project.tasks, { onDelete: 'CASCADE' })
  project!: Project;

  @Column({ type: 'uuid' })
  projectId!: string; // Explicit column for project's ID

  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true, onDelete: 'SET NULL' })
  assignee?: User; // The user assigned to the task

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string; // Explicit column for assignee's ID

  @OneToMany(() => Comment, comment => comment.task)
  comments!: Comment[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
```