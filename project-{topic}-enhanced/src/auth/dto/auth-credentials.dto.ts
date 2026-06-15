```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class AuthCredentialsDto {
  @ApiProperty({
    description: 'Unique username for the user',
    minLength: 4,
    maxLength: 20,
    example: 'john_doe',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username: string;

  @ApiProperty({
    description: 'Password for the user account',
    minLength: 6,
    maxLength: 32,
    example: 'SecurePass123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;
}
```