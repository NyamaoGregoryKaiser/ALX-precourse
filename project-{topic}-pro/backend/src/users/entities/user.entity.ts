```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique identifier of the user' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'First name of the user' })
  @Column({ length: 50 })
  firstName: string;

  @ApiProperty({ description: 'Last name of the user' })
  @Column({ length: 50 })
  lastName: string;

  @ApiProperty({ description: 'Email address of the user (unique)' })
  @Column({ unique: true })
  email: string;

  // Do not expose password in API responses directly.
  // Add select: false to the column definition to prevent it from being loaded by default.
  // It will only be loaded when explicitly requested (e.g., during login validation).
  @Column({ select: false })
  password: string;

  @ApiProperty({ description: 'Roles assigned to the user', enum: UserRole, isArray: true, example: [UserRole.USER] })
  @Column('simple-array', { default: [UserRole.USER] })
  roles: UserRole[];

  @ApiProperty({ description: 'Timestamp when the user was created' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the user was last updated' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Project, project => project.owner)
  projects: Project[];

  @OneToMany(() => Task, task => task.assignee)
  assignedTasks: Task[];

  @OneToMany(() => Comment, comment => comment.author)
  comments: Comment[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];
}
```