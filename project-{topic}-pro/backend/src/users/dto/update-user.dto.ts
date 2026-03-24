```typescript
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength, MaxLength, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

// PartialType makes all properties of CreateUserDto optional
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'New first name of the user', required: false, minLength: 2, maxLength: 50, example: 'Jane' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ description: 'New last name of the user', required: false, minLength: 2, maxLength: 50, example: 'Smith' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  // Email and password are often updated through separate, more secure flows
  // For this example, we'll explicitly disallow updating them through this DTO in the service.
  // Roles might be updateable by an admin.
  @ApiProperty({ description: 'New roles for the user (Admin only)', enum: UserRole, isArray: true, required: false, example: [UserRole.USER, UserRole.VIEWER] })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @MinLength(1, { message: 'At least one role must be provided' })
  roles?: UserRole[];
}
```