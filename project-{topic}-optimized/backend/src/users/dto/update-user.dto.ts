import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsArray, ArrayMinSize, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

/**
 * Data Transfer Object (DTO) for updating an existing user.
 * It uses `PartialType` from `@nestjs/swagger` to make all fields of `CreateUserDto` optional.
 * Additional validation rules can be applied or overridden as needed.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  /**
   * Optional: New password for the user.
   * If provided, must adhere to strong password policies.
   * @example "NewSecureP@ss2025"
   */
  @ApiProperty({
    description: 'Optional: New password for the user',
    example: 'NewP@ssword123',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  password?: string;

  /**
   * Optional: Updated roles assigned to the user.
   * @example ["USER", "ANALYST"]
   */
  @ApiProperty({
    description: 'Optional: Roles assigned to the user',
    enum: UserRole,
    isArray: true,
    example: [UserRole.USER, UserRole.ANALYST],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(UserRole, { each: true, message: 'Each role must be a valid UserRole enum value.' })
  roles?: UserRole[];
}