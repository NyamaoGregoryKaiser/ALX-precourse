```typescript
import { IsString, IsUUID, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID of the user to notify', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Message content of the notification', minLength: 5, maxLength: 500, example: 'Your task "Fix bug #123" is now overdue.' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  message: string;

  @ApiProperty({ description: 'Whether the notification is read', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiProperty({ description: 'Type of entity related to the notification (e.g., "task", "project")', required: false, example: 'task' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @ApiProperty({ description: 'ID of the related entity', required: false, example: 'f1e2d3c4-b5a6-9876-5432-10fedcba9876' })
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
```