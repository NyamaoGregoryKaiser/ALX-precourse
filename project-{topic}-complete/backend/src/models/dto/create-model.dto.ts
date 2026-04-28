import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateModelDto {
  @ApiProperty({ description: 'Name of the ML model', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Description of the model', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Version of the model (e.g., v1.0, 1.0.0)', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^v?\d+(\.\d+){0,2}$/, { message: 'Version must be in format like v1.0 or 1.0.0' })
  version: string;
}