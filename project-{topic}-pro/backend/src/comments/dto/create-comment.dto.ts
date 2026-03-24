```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Content of the comment', minLength: 1, maxLength: 1000, example: 'I think we should prioritize the backend implementation first.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
```