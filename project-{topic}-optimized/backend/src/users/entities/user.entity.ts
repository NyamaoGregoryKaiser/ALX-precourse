import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';

/**
 * Represents a User entity in the database.
 * Users can create projects, be assigned tasks, and have specific roles.
 */
@Entity('users')
export class User {
  /**
   * Unique identifier for the user.
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({ description: 'Unique identifier for the user', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique username for the user.
   * @example "john.doe"
   */
  @ApiProperty({ description: 'Unique username for the user', example: 'testuser' })
  @Column({ unique: true, length: 50 })
  username: string;

  /**
   * Unique email address for the user.
   * @example "john.doe@example.com"
   */
  @ApiProperty({ description: 'Unique email address for the user', example: 'testuser@example.com' })
  @Column({ unique: true, length: 100 })
  email: string;

  /**
   * Hashed password of the user. This field is generally not exposed via API.
   */
  @ApiProperty({ description: 'Hashed password of the user (internal)', readOnly: true })
  @Column({ select: false }) // Do not select this column by default
  password: string;

  /**
   * Roles assigned to the user, determining their permissions.
   * @example ["USER", "ADMIN"]
   */
  @ApiProperty({
    description: 'Roles assigned to the user',
    enum: UserRole,
    isArray: true,
    example: ['USER'],
  })
  @Column('simple-array', { default: [UserRole.USER] })
  roles: UserRole[];

  /**
   * The date and time when the user was created.
   * @example "2023-10-27T10:00:00.000Z"
   */
  @ApiProperty({ description: 'Date and time of user creation', example: '2023-01-01T12:00:00Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  /**
   * The date and time when the user was last updated.
   * @example "2023-10-27T11:30:00.000Z"
   */
  @ApiProperty({ description: 'Date and time of last update', example: '2023-01-01T13:00:00Z' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * One-to-many relationship with projects.
   * A user can own multiple projects.
   */
  @OneToMany(() => Project, (project) => project.owner)
  projects: Project[];

  /**
   * One-to-many relationship with tasks.
   * A user can be assigned multiple tasks.
   */
  @OneToMany(() => Task, (task) => task.assignedTo)
  tasks: Task[];
}