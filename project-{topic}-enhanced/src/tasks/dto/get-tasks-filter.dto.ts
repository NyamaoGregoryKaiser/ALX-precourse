```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { TaskStatus } from '../enum/task-status.enum';
import { TaskPriority } from '../enum/task-priority.enum';

export class GetTasksFilterDto {
  @ApiPropertyOptional({
    description: 'Filter tasks by status',
    enum: TaskStatus,
    example: TaskStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Invalid status provided' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Filter tasks by priority',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Invalid priority provided' })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Filter tasks by category ID',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Category ID must be a positive integer' })
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Search tasks by title or description',
    example: 'urgent meeting',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks due on or before a specific date (ISO 8601)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dueDateBefore?: Date;
}
```