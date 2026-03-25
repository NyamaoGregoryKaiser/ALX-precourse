import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';

/**
 * Represents a Project entity in the database.
 * Projects are containers for tasks and are owned by a single user.
 */
@Entity('projects')
export class Project {
  /**
   * Unique identifier for the project.
   * @example "f47ac10b-58cc-4372-a567-0e02b2c3d479"
   */
  @ApiProperty({ description: 'Unique identifier for the project', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Name of the project.
   * @example "Website Redesign Phase 1"
   */
  @ApiProperty({ description: 'Name of the project', example: 'Task Management System Backend' })
  @Column({ length: 255 })
  name: string;

  /**
   * Description of the project.
   * @example "Complete overhaul of the company website, focusing on UX/UI and performance."
   */
  @ApiProperty({ description: 'Description of the project', example: 'Develop a robust and scalable backend for a task management application using NestJS.' })
  @Column('text', { nullable: true })
  description: string;

  /**
   * The user who owns this project.
   * Many projects can be owned by one user.
   */
  @ApiProperty({ type: () => User, description: 'The user who owns this project' })
  @ManyToOne(() => User, (user) => user.projects, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  /**
   * The ID of the user who owns this project.
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({ description: 'The ID of the user who owns this project', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @Column()
  ownerId: string;

  /**
   * The date and time when the project was created.
   * @example "2023-10-27T10:00:00.000Z"
   */
  @ApiProperty({ description: 'Date and time of project creation', example: '2023-01-01T12:00:00Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  /**
   * The date and time when the project was last updated.
   * @example "2023-10-27T11:30:00.000Z"
   */
  @ApiProperty({ description: 'Date and time of last update', example: '2023-01-01T13:00:00Z' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * One-to-many relationship with tasks.
   * A project can have multiple tasks.
   */
  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];
}