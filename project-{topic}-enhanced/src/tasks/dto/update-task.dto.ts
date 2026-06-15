```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { TaskStatus } from '../enum/task-status.enum';
import { TaskPriority } from '../enum/task-priority.enum';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'New title for the task',
    example: 'Review project proposal',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'New detailed description for the task',
    example: 'Go over the details of the proposal with the team.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'New status for the task',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Invalid status provided' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'New priority for the task',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Invalid priority provided' })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'New due date for the task (ISO 8601 format)',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({
    description:
      'New ID of the category this task belongs to. Use `null` to unassign.',
    example: 2,
    type: 'integer',
    nullable: true,
  })
  @ValidateIf((o) => o.categoryId !== undefined) // Allows categoryId to be null but checks if it's provided
  @IsOptional()
  @IsInt({ message: 'Category ID must be an integer or null' })
  @Min(1, { message: 'Category ID must be a positive integer or null' })
  categoryId?: number | null;
}
```