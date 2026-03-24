```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('projects')
export class Project {
  @ApiProperty({ description: 'Unique identifier of the project' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Name of the project', example: 'Website Redesign' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'Description of the project', example: 'Redesign the company website to improve UX and conversion.' })
  @Column('text', { nullable: true })
  description: string;

  @ApiProperty({ description: 'Timestamp when the project was created' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the project was last updated' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @ApiProperty({ type: () => User, description: 'The user who owns this project' })
  @ManyToOne(() => User, user => user.projects, { eager: true, onDelete: 'CASCADE' })
  owner: User;

  @ApiProperty({ type: () => [Task], description: 'List of tasks belonging to this project' })
  @OneToMany(() => Task, task => task.project, { cascade: true })
  tasks: Task[];
}
```