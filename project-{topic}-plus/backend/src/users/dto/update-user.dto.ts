```typescript
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

// PartialType makes all fields optional based on CreateUserDto
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'johndoe_new', description: 'Updated username', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiProperty({ example: 'john.doe.new@example.com', description: 'Updated email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'new_secure_password', description: 'New password (will be hashed)', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: UserRole.ADMIN, description: 'Updated user role', enum: UserRole, required: false })
  @IsOptional()
  role?: UserRole;
}
```