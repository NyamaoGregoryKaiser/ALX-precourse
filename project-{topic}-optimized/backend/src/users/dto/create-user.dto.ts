import { IsString, IsNotEmpty, MinLength, IsEmail, Matches, IsEnum, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

/**
 * Data Transfer Object (DTO) for creating a new user.
 * This DTO is used for administrative user creation, allowing specification of roles.
 * For self-registration, `RegisterUserDto` in `auth` module is used.
 */
export class CreateUserDto {
  /**
   * The unique username for the new user.
   * @example "admin_user"
   */
  @ApiProperty({
    description: 'Unique username for the new user',
    example: 'manager_user',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
  username: string;

  /**
   * The email address for the new user. Must be a valid email format.
   * @example "admin@example.com"
   */
  @ApiProperty({
    description: 'Email address of the new user',
    example: 'manager@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;

  /**
   * The password for the new user.
   * Must be at least 8 characters long, include an uppercase letter, a lowercase letter,
   * a number, and a special character.
   * @example "SecureP@ss2024"
   */
  @ApiProperty({
    description: 'Password for the new user',
    example: 'SecureP@ss2024',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  password: string;

  /**
   * An optional array of roles assigned to the user. If not provided, defaults to `[UserRole.USER]`.
   * @example ["USER", "ADMIN"]
   */
  @ApiProperty({
    description: 'Optional: Roles assigned to the user',
    enum: UserRole,
    isArray: true,
    example: [UserRole.USER, UserRole.MANAGER],
    required: false,
    default: [UserRole.USER],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(UserRole, { each: true, message: 'Each role must be a valid UserRole enum value.' })
  roles?: UserRole[];
}