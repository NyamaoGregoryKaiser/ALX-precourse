```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Technology', description: 'Name of the category', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Articles related to software, hardware, and innovation.', description: 'Description of the category', required: false, maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description?: string;
}
```