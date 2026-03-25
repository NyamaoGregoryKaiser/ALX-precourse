import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';

/**
 * Data Transfer Object (DTO) for creating a new task.
 * Defines the expected structure and validation rules for new task data.
 */
export class CreateTaskDto {
  /**
   * The title of the task. Must be a non-empty string and up to 255 characters.
   * @example "Develop Task CRUD Endpoints"
   */
  @ApiProperty({
    description: 'Title of the task',
    example: 'Implement User Profile Page',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Task title cannot be empty.' })
  @MaxLength(255, {
    message: 'Task title cannot be longer than 255 characters.',
  })
  title: string;

  /**
   * Optional: A detailed description of the task.
   * @example "Implement RESTful API endpoints for creating, reading, updating, and deleting tasks."
   */
  @ApiProperty({
    description: 'Optional: Detailed description of the task',
    example: 'Design and code the frontend user profile page, integrating with the backend API.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Optional: The current status of the task. Defaults to `TODO` if not provided.
   * @example "IN_PROGRESS"
   */
  @ApiProperty({
    description: 'Optional: Current status of the task',
    enum: TaskStatus,
    example: TaskStatus.TODO,
    required: false,
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Invalid task status provided.' })
  status?: TaskStatus;

  /**
   * Optional: Priority of the task (0 for low, 1 for medium, 2 for high). Defaults to 0.
   * @example 1
   */
  @ApiProperty({
    description: 'Optional: Priority of the task (0=low, 1=medium, 2=high)',
    example: 0,
    minimum: 0,
    maximum: 2,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Priority must be a number.' })
  @Min(0, { message: 'Priority cannot be less than 0.' })
  @Max(2, { message: 'Priority cannot be more than 2.' })
  priority?: number;

  /**
   * Optional: The due date for the task in ISO 8601 format (e.g., "YYYY-MM-DDTHH:MM:SSZ").
   * @example "2023-11-30T10:00:00Z"
   */
  @ApiProperty({
    description: 'Optional: Due date for the task (ISO 8601 format)',
    example: '2023-12-15T23:59:59Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
  dueDate?: string;

  /**
   * The UUID of the project to which this task belongs.
   * @example "f47ac10b-58cc-4372-a567-0e02b2c3d479"
   */
  @ApiProperty({
    description: 'UUID of the project this task belongs to',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'Project ID must be a valid UUID.' })
  @IsNotEmpty({ message: 'Project ID cannot be empty.' })
  projectId: string;

  /**
   * Optional: The UUID of the user to whom this task is assigned.
   * If not provided, the task might default to being assigned to the project owner.
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({
    description: 'Optional: UUID of the user assigned to this task',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Assigned user ID must be a valid UUID.' })
  assignedToId?: string;
}