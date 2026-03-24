```typescript
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsString, MinLength, MaxLength, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ description: 'New title of the task', required: false, minLength: 3, maxLength: 255, example: 'Optimize database queries' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: 'New description of the task', required: false, example: 'Analyze slow queries and add appropriate indexes.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'New status of the task', enum: TaskStatus, required: false, example: TaskStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: 'New priority of the task', enum: TaskPriority, required: false, example: TaskPriority.HIGH })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: 'New due date of the task (ISO 8601 format)', required: false, example: '2024-04-10T17:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({ description: 'New UUID of the user assigned to this task, or null to unassign', required: false, example: 'b1c2d3e4-f5a6-7890-1234-567890abcdef' })
  @IsOptional()
  @IsUUID('4', { message: 'Assignee ID must be a valid UUID' })
  assigneeId?: string | null; // Allow null to unassign
}
```