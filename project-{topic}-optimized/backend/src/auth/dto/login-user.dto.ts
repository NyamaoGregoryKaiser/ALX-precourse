import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object (DTO) for user login requests.
 * Defines the expected structure and validation rules for login credentials.
 */
export class LoginUserDto {
  /**
   * The username of the user attempting to log in.
   * @example "john.doe"
   */
  @ApiProperty({
    description: 'Username for login',
    example: 'testuser',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
  username: string;

  /**
   * The password of the user attempting to log in.
   * @example "P@ssword123"
   */
  @ApiProperty({
    description: 'Password for login',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;
}