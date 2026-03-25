import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../enums/task-status.enum';

/**
 * Represents a Task entity in the database.
 * Tasks belong to a project and can be assigned to a user.
 */
@Entity('tasks')
export class Task {
  /**
   * Unique identifier for the task.
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({ description: 'Unique identifier for the task', example: 'd1c2b3a4-f5e6-7890-1234-567890abcdef' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Title of the task.
   * @example "Implement User Authentication"
   */
  @ApiProperty({ description: 'Title of the task', example: 'Refactor Task API Endpoints' })
  @Column({ length: 255 })
  title: string;

  /**
   * Detailed description of the task.
   * @example "Implement JWT-based authentication for user login and registration."
   */
  @ApiProperty({ description: 'Detailed description of the task', example: 'Improve code quality and add error handling to existing task CRUD operations.' })
  @Column('text', { nullable: true })
  description: string;

  /**
   * Current status of the task.
   * @example "IN_PROGRESS"
   */
  @ApiProperty({ description: 'Current status of the task', enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  /**
   * Priority of the task (e.g., 0 for low, 1 for medium, 2 for high).
   * @example 1
   */
  @ApiProperty({ description: 'Priority of the task (0=low, 1=medium, 2=high)', example: 1 })
  @Column({ type: 'int', default: 0 })
  priority: number;

  /**
   * Due date for the task.
   * @example "2023-11-15T23:59:59.000Z"
   */
  @ApiProperty({ description: 'Due date for the task', example: '2023-12-31T17:00:00Z', type: 'string', format: 'date-time', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date;

  /**
   * The project to which this task belongs.
   * Many tasks can belong to one project.
   */
  @ApiProperty({ type: () => Project, description: 'The project this task belongs to' })
  @ManyToOne(() => Project, (project) => project.tasks, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  /**
   * The ID of the project to which this task belongs.
   * @example "f47ac10b-58cc-4372-a567-0e02b2c3d479"
   */
  @ApiProperty({ description: 'The ID of the project this task belongs to', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @Column()
  projectId: string;

  /**
   * The user to whom this task is assigned.
   * Many tasks can be assigned to one user.
   */
  @ApiProperty({ type: () => User, description: 'The user assigned to this task', nullable: true })
  @ManyToOne(() => User, (user) => user.tasks, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  /**
   * The ID of the user to whom this task is assigned.
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({ description: 'The ID of the user assigned to this task', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', nullable: true })
  @Column({ nullable: true })
  assignedToId: string;

  /**
   * The date and time when the task was created.
   * @example "2023-10-27T10:00:00.000Z"
   */
  @ApiProperty({ description: 'Date and time of task creation', example: '2023-01-01T12:00:00Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  /**
   * The date and time when the task was last updated.
   * @example "2023-10-27T11:30:00.000Z"
   */
  @ApiProperty({ description: 'Date and time of last update', example: '2023-01-01T13:00:00Z' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}