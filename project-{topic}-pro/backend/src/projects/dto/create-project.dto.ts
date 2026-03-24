```typescript
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Name of the project', minLength: 3, maxLength: 100, example: 'New Feature Development' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Description of the project', required: false, example: 'Develop and integrate a new user authentication feature.' })
  @IsOptional()
  @IsString()
  description?: string;
}
```