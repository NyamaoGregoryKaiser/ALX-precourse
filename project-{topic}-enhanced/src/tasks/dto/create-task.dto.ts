```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
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

export class CreateTaskDto {
  @ApiProperty({
    description: 'Title of the task',
    example: 'Buy groceries',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the task',
    example: 'Milk, bread, eggs, vegetables for the week.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Current status of the task',
    enum: TaskStatus,
    example: TaskStatus.OPEN,
    default: TaskStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Priority of the task',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Due date for the task (ISO 8601 format)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'ID of the category this task belongs to',
    example: 1,
    type: Number,
  })
  @ValidateIf((o) => o.categoryId !== null) // Allow categoryId to be null or an integer
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Category ID must be a positive integer' })
  categoryId?: number | null; // Allow null to represent no category
}
```