import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'Unique username', minLength: 3, maxLength: 50, required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiProperty({ description: 'Unique email address', format: 'email', required: false })
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email?: string;

  @ApiProperty({ description: 'User password', minLength: 6, maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password?: string;

  @ApiProperty({ description: 'User role', enum: Role, default: Role.User, required: false })
  @IsOptional()
  @IsEnum(Role)
  @IsNotEmpty()
  role?: Role;
}