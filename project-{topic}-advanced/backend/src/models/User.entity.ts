```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './Project.entity';
import { Task } from './Task.entity';
import { Comment } from './Comment.entity';

export type UserRole = 'admin' | 'member' | 'guest'; // Extend as needed

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 50 })
  username!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ select: false, length: 255 }) // Do not select password by default for security
  password!: string;

  @Column({ type: 'enum', enum: ['admin', 'member', 'guest'], default: 'member' })
  role!: UserRole;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Project, project => project.owner)
  ownedProjects!: Project[];

  @OneToMany(() => Task, task => task.assignee)
  assignedTasks!: Task[];

  @OneToMany(() => Comment, comment => comment.author)
  comments!: Comment[];
}
```