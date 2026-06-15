```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'New unique username for the user',
    minLength: 4,
    maxLength: 20,
    example: 'jane_doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username?: string;

  @ApiPropertyOptional({
    description: 'New password for the user account',
    minLength: 6,
    maxLength: 32,
    example: 'NewSecurePass456',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password?: string;
}
```