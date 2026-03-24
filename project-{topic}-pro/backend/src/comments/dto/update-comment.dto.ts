```typescript
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateCommentDto } from './create-comment.dto';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @ApiProperty({ description: 'New content of the comment', required: false, minLength: 1, maxLength: 1000, example: 'Revised thought: Let\'s split it into two subtasks.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content?: string;
}
```