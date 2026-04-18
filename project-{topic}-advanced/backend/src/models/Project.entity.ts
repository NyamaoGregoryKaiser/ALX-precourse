```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './User.entity';
import { Task } from './Task.entity';

@Entity('projects')
@Index(['ownerId', 'name'], { unique: true }) // Ensure owner cannot have two projects with same name
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 'active', length: 50 }) // E.g., 'active', 'archived', 'completed'
  status!: string;

  @ManyToOne(() => User, user => user.ownedProjects, { onDelete: 'CASCADE', eager: true }) // Eager load owner by default
  owner!: User; // The user who created the project

  @Column({ type: 'uuid' })
  ownerId!: string; // Explicit column for owner's ID

  @OneToMany(() => Task, task => task.project)
  tasks!: Task[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
```