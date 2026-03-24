```typescript
import { IsString, IsEmail, MinLength, MaxLength, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'First name of the user', minLength: 2, maxLength: 50, example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', minLength: 2, maxLength: 50, example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ description: 'Email address of the user (must be unique)', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password for the user (min 6 characters)', minLength: 6, example: 'Password123!' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ description: 'Roles assigned to the user', enum: UserRole, isArray: true, required: false, example: [UserRole.USER] })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @MinLength(1, { message: 'At least one role must be provided' })
  roles?: UserRole[]; // Optional, default will be 'USER' in service
}
```