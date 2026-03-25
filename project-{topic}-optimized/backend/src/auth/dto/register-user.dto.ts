import { IsString, IsNotEmpty, MinLength, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object (DTO) for user registration requests.
 * Defines the expected structure and validation rules for new user credentials.
 */
export class RegisterUserDto {
  /**
   * The unique username for the new user.
   * @example "jane.doe"
   */
  @ApiProperty({
    description: 'Unique username for the new user',
    example: 'newuser',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
  username: string;

  /**
   * The email address for the new user. Must be a valid email format.
   * @example "jane.doe@example.com"
   */
  @ApiProperty({
    description: 'Email address of the new user',
    example: 'newuser@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;

  /**
   * The password for the new user.
   * Must be at least 8 characters long, include an uppercase letter, a lowercase letter,
   * a number, and a special character.
   * @example "StrongP@ss1"
   */
  @ApiProperty({
    description: 'Password for the new user',
    example: 'P@ssword123',
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
}