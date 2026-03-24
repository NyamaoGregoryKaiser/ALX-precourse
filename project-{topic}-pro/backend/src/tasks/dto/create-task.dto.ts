```typescript
import { IsString, MinLength, MaxLength, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class CreateTaskDto {
  @ApiProperty({ description: 'Title of the task', minLength: 3, maxLength: 255, example: 'Refactor authentication module' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Description of the task', required: false, example: 'Improve the readability and maintainability of the auth module.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Initial status of the task', enum: TaskStatus, required: false, default: TaskStatus.OPEN })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus; // Defaulted in service

  @ApiProperty({ description: 'Priority of the task', enum: TaskPriority, required: false, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority; // Defaulted in service

  @ApiProperty({ description: 'Due date of the task (ISO 8601 format)', required: false, example: '2024-03-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({ description: 'UUID of the user assigned to this task', required: false, example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
```