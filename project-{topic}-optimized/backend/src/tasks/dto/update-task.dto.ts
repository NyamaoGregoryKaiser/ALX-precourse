import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

/**
 * Data Transfer Object (DTO) for updating an existing task.
 * It extends `CreateTaskDto` using `PartialType` to make all fields optional,
 * allowing for partial updates.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  /**
   * Optional: New title for the task.
   * @example "Review Pull Request for Task API"
   */
  @ApiProperty({
    description: 'Optional: New title for the task',
    example: 'Review Design Mockups',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Task title cannot be empty.', groups: ['update'] })
  @MaxLength(255, {
    message: 'Task title cannot be longer than 255 characters.',
  })
  title?: string;

  /**
   * Optional: New detailed description of the task.
   * @example "Review the PR for task CRUD operations and provide feedback."
   */
  @ApiProperty({
    description: 'Optional: New detailed description of the task',
    example: 'Provide feedback on the latest UI mockups for the dashboard.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Optional: New status of the task.
   * @example "DONE"
   */
  @ApiProperty({
    description: 'Optional: New status of the task',
    enum: TaskStatus,
    example: TaskStatus.DONE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Invalid task status provided.' })
  status?: TaskStatus;

  /**
   * Optional: New priority of the task.
   * @example 2
   */
  @ApiProperty({
    description: 'Optional: New priority of the task (0=low, 1=medium, 2=high)',
    example: 2,
    minimum: 0,
    maximum: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Priority must be a number.' })
  @Min(0, { message: 'Priority cannot be less than 0.' })
  @Max(2, { message: 'Priority cannot be more than 2.' })
  priority?: number;

  /**
   * Optional: New due date for the task in ISO 8601 format.
   * @example "2023-12-05T17:00:00Z"
   */
  @ApiProperty({
    description: 'Optional: New due date for the task (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
  dueDate?: string;

  /**
   * Optional: New UUID of the project this task belongs to.
   * @example "b2c3d4a1-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({
    description: 'Optional: New UUID of the project this task belongs to',
    example: 'b2c3d4a1-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Project ID must be a valid UUID.' })
  projectId?: string;

  /**
   * Optional: New UUID of the user to whom this task is assigned.
   * @example "c3d4a1b2-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({
    description: 'Optional: New UUID of the user assigned to this task',
    example: 'c3d4a1b2-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Assigned user ID must be a valid UUID.' })
  assignedToId?: string;
}